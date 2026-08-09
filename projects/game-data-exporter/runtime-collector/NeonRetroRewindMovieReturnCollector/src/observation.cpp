#include "observation.hpp"

#include <Windows.h>
#include <bcrypt.h>
#include <glaze/glaze.hpp>

#include <algorithm>
#include <array>
#include <chrono>
#include <fstream>
#include <iomanip>
#include <limits>
#include <regex>
#include <sstream>
#include <stdexcept>
#include <system_error>

extern "C" IMAGE_DOS_HEADER __ImageBase;

namespace NeonRetroRewind
{
    namespace
    {
        constexpr auto MaxEvents = 256U;
        constexpr auto MaxMovies = 256U;
        constexpr auto MaxInputBytes = 64U * 1024U * 1024U;
        constexpr auto ObservationFileName = L"movie-return-observation.json";
        constexpr auto HashFileName = L"movie-return-observation.sha256";
        constexpr auto ConfigRelativePath = L"config.json";
        constexpr auto SchemaRelativePath = L"mods/NeonRetroRewindMovieReturnCollector/movie-return-observation.schema.json";
        constexpr auto MechanicsRelativePath = L"inputs/movie-return-mechanics.json";

        auto is_lower_sha256(const std::string& value) -> bool
        {
            return value.size() == 64 && std::ranges::all_of(value, [](const char character) {
                       return (character >= '0' && character <= '9') || (character >= 'a' && character <= 'f');
                   });
        }

        auto is_digits(const std::string& value) -> bool
        {
            return !value.empty() && std::ranges::all_of(value, [](const char character) { return character >= '0' && character <= '9'; });
        }

        auto read_bytes(const std::filesystem::path& path) -> std::vector<std::uint8_t>
        {
            std::ifstream stream{path, std::ios::binary | std::ios::ate};
            if (!stream)
            {
                throw std::runtime_error{"Could not open collector input."};
            }
            const auto end = stream.tellg();
            if (end <= 0 || static_cast<std::uint64_t>(end) > MaxInputBytes)
            {
                throw std::runtime_error{"Collector input has an invalid size."};
            }
            std::vector<std::uint8_t> bytes(static_cast<std::size_t>(end));
            stream.seekg(0);
            stream.read(reinterpret_cast<char*>(bytes.data()), static_cast<std::streamsize>(bytes.size()));
            if (!stream)
            {
                throw std::runtime_error{"Could not read collector input."};
            }
            return bytes;
        }

        auto sha256(const std::span<const std::uint8_t> bytes) -> std::string
        {
            BCRYPT_ALG_HANDLE algorithm{};
            BCRYPT_HASH_HANDLE hash{};
            DWORD object_size{};
            DWORD result_size{};
            std::array<std::uint8_t, 32> digest{};

            auto check = [](const NTSTATUS status) {
                if (status < 0)
                {
                    throw std::runtime_error{"SHA-256 calculation failed."};
                }
            };

            try
            {
                check(BCryptOpenAlgorithmProvider(&algorithm, BCRYPT_SHA256_ALGORITHM, nullptr, 0));
                check(BCryptGetProperty(algorithm,
                                        BCRYPT_OBJECT_LENGTH,
                                        reinterpret_cast<PUCHAR>(&object_size),
                                        sizeof(object_size),
                                        &result_size,
                                        0));
                std::vector<std::uint8_t> object(object_size);
                check(BCryptCreateHash(algorithm, &hash, object.data(), object_size, nullptr, 0, 0));
                std::size_t offset{};
                while (offset < bytes.size())
                {
                    const auto chunk = std::min<std::size_t>(bytes.size() - offset, std::numeric_limits<ULONG>::max());
                    check(BCryptHashData(hash, const_cast<PUCHAR>(bytes.data() + offset), static_cast<ULONG>(chunk), 0));
                    offset += chunk;
                }
                check(BCryptFinishHash(hash, digest.data(), static_cast<ULONG>(digest.size()), 0));
                BCryptDestroyHash(hash);
                BCryptCloseAlgorithmProvider(algorithm, 0);
            }
            catch (...)
            {
                if (hash)
                {
                    BCryptDestroyHash(hash);
                }
                if (algorithm)
                {
                    BCryptCloseAlgorithmProvider(algorithm, 0);
                }
                throw;
            }

            std::ostringstream output;
            output << std::hex << std::setfill('0');
            for (const auto byte : digest)
            {
                output << std::setw(2) << static_cast<unsigned>(byte);
            }
            return output.str();
        }

        template <typename Identity>
        auto identity_matches(const std::filesystem::path& path, const Identity& identity) -> bool
        {
            const auto bytes = read_bytes(path);
            return identity.fileName == path.filename().string() && identity.sizeBytes == bytes.size() && identity.sha256 == sha256(bytes);
        }

        auto load_config(const std::filesystem::path& module_path) -> CollectorConfig
        {
            const auto mod_root = module_path.parent_path().parent_path();
            const auto stage_root = mod_root.parent_path().parent_path();
            const auto config_path = mod_root / ConfigRelativePath;
            const auto config_bytes = read_bytes(config_path);
            const std::string config_json{config_bytes.begin(), config_bytes.end()};
            CollectorConfig config;
            if (const auto error = glz::read_json(config, config_json); error)
            {
                throw std::runtime_error{"Collector config is not valid JSON for the closed config contract."};
            }

            if (config.artifactType != "movie-return-runtime-collector-config" || config.build.steamAppId != "3552140" ||
                !is_digits(config.build.steamBuildId) || config.targetMechanics.fileName != "movie-return-mechanics.json" ||
                config.targetMechanics.artifactType != "movie-return-mechanics" || !is_lower_sha256(config.targetMechanics.sha256) ||
                config.collector.name != CollectorName || config.collector.version != CollectorVersion || config.runtimeHost.name != RuntimeHostName ||
                config.runtimeHost.version != RuntimeHostVersion || config.observationSchema.fileName != "movie-return-observation.schema.json" ||
                config.observationSchema.stagedRelativePath != "mods/NeonRetroRewindMovieReturnCollector/movie-return-observation.schema.json" ||
                !is_lower_sha256(config.observationSchema.sha256))
            {
                throw std::runtime_error{"Collector config does not match this collector or game build contract."};
            }

            const std::filesystem::path output_root{config.observationOutputRootAbsolutePath};
            if (!output_root.is_absolute())
            {
                throw std::runtime_error{"Collector output root is not absolute."};
            }
            if (!identity_matches(stage_root / SchemaRelativePath, config.observationSchema) ||
                !identity_matches(stage_root / MechanicsRelativePath, config.targetMechanics))
            {
                throw std::runtime_error{"A staged collector input does not match its bound identity."};
            }
            return config;
        }

        auto random_suffix() -> std::string
        {
            std::array<std::uint8_t, 4> bytes{};
            if (BCryptGenRandom(nullptr, bytes.data(), static_cast<ULONG>(bytes.size()), BCRYPT_USE_SYSTEM_PREFERRED_RNG) < 0)
            {
                throw std::runtime_error{"Could not create the collector run identifier."};
            }
            std::ostringstream output;
            output << std::hex << std::setfill('0');
            for (const auto byte : bytes)
            {
                output << std::setw(2) << static_cast<unsigned>(byte);
            }
            return output.str();
        }

        auto run_id_now() -> std::string
        {
            const auto now = std::chrono::system_clock::now();
            const auto time = std::chrono::system_clock::to_time_t(now);
            std::tm utc{};
            gmtime_s(&utc, &time);
            std::ostringstream output;
            output << std::put_time(&utc, "%Y%m%dT%H%M%SZ-") << random_suffix();
            return output.str();
        }

        auto json_string(const std::string& value) -> std::string
        {
            std::string output{"\""};
            for (const unsigned char character : value)
            {
                switch (character)
                {
                case '\"': output += "\\\""; break;
                case '\\': output += "\\\\"; break;
                case '\b': output += "\\b"; break;
                case '\f': output += "\\f"; break;
                case '\n': output += "\\n"; break;
                case '\r': output += "\\r"; break;
                case '\t': output += "\\t"; break;
                default:
                    if (character < 0x20)
                    {
                        std::ostringstream escaped;
                        escaped << "\\u" << std::hex << std::setw(4) << std::setfill('0') << static_cast<unsigned>(character);
                        output += escaped.str();
                    }
                    else
                    {
                        output += static_cast<char>(character);
                    }
                }
            }
            output += '\"';
            return output;
        }

        auto serialize_collection(const MovieCollection& collection) -> std::string
        {
            std::ostringstream output;
            output << "{\"totalCount\":" << collection.totalCount << ",\"truncated\":" << (collection.truncated ? "true" : "false") << ",\"movies\":[";
            for (std::size_t index = 0; index < collection.movies.size(); ++index)
            {
                if (index)
                {
                    output << ',';
                }
                output << "{\"referenceType\":\"object-path\",\"value\":" << json_string(collection.movies[index]) << '}';
            }
            output << "]}";
            return output.str();
        }

        auto serialize_queues(const RentalQueues& queues) -> std::string
        {
            return "{\"rentedMovies\":" + serialize_collection(queues.rentedMovies) + ",\"readyMovies\":" + serialize_collection(queues.readyMovies) + '}';
        }

        auto serialize_customer(const CustomerState& state) -> std::string
        {
            return "{\"readyMovies\":" + serialize_collection(state.readyMovies) + ",\"customerInventoryMovies\":" +
                   serialize_collection(state.customerInventoryMovies) + '}';
        }

        auto serialize_result(const SelectionResult& result) -> std::string
        {
            return std::string{"{\"found\":"} + (result.found ? "true" : "false") + ",\"selectedMovies\":" +
                   serialize_collection(result.selectedMovies) + '}';
        }

        auto validate_collection(const MovieCollection& collection) -> bool
        {
            return collection.totalCount >= 0 && collection.movies.size() <= MaxMovies &&
                   static_cast<std::uint64_t>(collection.totalCount) >= collection.movies.size() &&
                   collection.truncated == (static_cast<std::uint64_t>(collection.totalCount) > collection.movies.size()) &&
                   std::ranges::all_of(collection.movies, [](const std::string& movie) { return !movie.empty() && movie.size() <= 1024; });
        }

        auto validate_event(const ObservationEvent& event) -> bool
        {
            if (event.sequence < 1 || event.sequence > static_cast<std::int32_t>(MaxEvents) || event.observedAtUtc.empty() ||
                event.classPath.empty() || event.classPath.size() > 1024 || event.objectPath.empty() || event.objectPath.size() > 1024 ||
                event.functionPath.empty() || event.functionPath.size() > 1024)
            {
                return false;
            }
            if (event.kind == EventKind::Readiness)
            {
                return validate_collection(event.preQueues.rentedMovies) && validate_collection(event.preQueues.readyMovies) &&
                       validate_collection(event.postQueues.rentedMovies) && validate_collection(event.postQueues.readyMovies);
            }
            if (event.kind == EventKind::Selection)
            {
                return validate_collection(event.preQueues.rentedMovies) && validate_collection(event.preQueues.readyMovies) &&
                       validate_collection(event.result.selectedMovies);
            }
            return validate_collection(event.preCustomer.readyMovies) && validate_collection(event.preCustomer.customerInventoryMovies) &&
                   validate_collection(event.result.selectedMovies) && validate_collection(event.postCustomer.readyMovies) &&
                   validate_collection(event.postCustomer.customerInventoryMovies);
        }

        auto write_atomic(const std::filesystem::path& final_path, const std::string& contents) -> void
        {
            const auto temporary_path = final_path.wstring() + L".tmp";
            HANDLE file = CreateFileW(temporary_path.c_str(), GENERIC_WRITE, 0, nullptr, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
            if (file == INVALID_HANDLE_VALUE)
            {
                throw std::runtime_error{"Could not open an observation temporary file."};
            }
            bool closed{};
            try
            {
                std::size_t written_total{};
                while (written_total < contents.size())
                {
                    const auto remaining = std::min<std::size_t>(contents.size() - written_total, std::numeric_limits<DWORD>::max());
                    DWORD written{};
                    if (!WriteFile(file, contents.data() + written_total, static_cast<DWORD>(remaining), &written, nullptr) || written == 0)
                    {
                        throw std::runtime_error{"Could not write an observation temporary file."};
                    }
                    written_total += written;
                }
                if (!FlushFileBuffers(file) || !CloseHandle(file))
                {
                    throw std::runtime_error{"Could not close an observation temporary file."};
                }
                closed = true;
                if (!MoveFileExW(temporary_path.c_str(), final_path.c_str(), MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH))
                {
                    throw std::runtime_error{"Could not atomically publish an observation file."};
                }
            }
            catch (...)
            {
                if (!closed)
                {
                    CloseHandle(file);
                }
                DeleteFileW(temporary_path.c_str());
                throw;
            }
        }
    }

    auto current_module_path() -> std::filesystem::path
    {
        std::wstring buffer(32768, L'\0');
        const auto length = GetModuleFileNameW(reinterpret_cast<HMODULE>(&__ImageBase), buffer.data(), static_cast<DWORD>(buffer.size()));
        if (length == 0 || length == buffer.size())
        {
            throw std::runtime_error{"Could not resolve the collector module path."};
        }
        buffer.resize(length);
        return std::filesystem::path{buffer};
    }

    ObservationWriter::ObservationWriter(const std::filesystem::path& module_path)
        : m_config{load_config(module_path)}, m_run_id{run_id_now()}, m_started_at{utc_now()}
    {
        const std::filesystem::path output_root{m_config.observationOutputRootAbsolutePath};
        const auto run_directory = output_root / m_config.build.steamBuildId / m_run_id;
        std::filesystem::create_directories(run_directory.parent_path());
        if (!std::filesystem::create_directory(run_directory))
        {
            throw std::runtime_error{"Collector run directory already exists."};
        }
        m_observation_path = run_directory / ObservationFileName;
        try
        {
            persist();
        }
        catch (...)
        {
            std::error_code ignored;
            std::filesystem::remove(m_observation_path, ignored);
            std::filesystem::remove(run_directory / HashFileName, ignored);
            std::filesystem::remove(m_observation_path.wstring() + L".tmp", ignored);
            std::filesystem::remove((run_directory / HashFileName).wstring() + L".tmp", ignored);
            std::filesystem::remove(run_directory, ignored);
            throw;
        }
    }

    ObservationWriter::~ObservationWriter()
    {
        if (!m_terminal)
        {
            abort("game-closed");
        }
    }

    auto ObservationWriter::append(ObservationEvent event) -> bool
    {
        if (m_terminal || m_events.size() >= MaxEvents)
        {
            return false;
        }
        event.sequence = static_cast<std::int32_t>(m_events.size() + 1);
        if (!validate_event(event))
        {
            fail("validation-failed");
            return false;
        }
        m_events.emplace_back(std::move(event));
        const auto complete = has_all_required_events();
        if (complete)
        {
            m_status = "complete";
            m_status_reason.reset();
            m_finished_at = utc_now();
        }
        else if (m_events.size() == MaxEvents)
        {
            m_status = "failed";
            m_status_reason = "validation-failed";
            m_finished_at = utc_now();
        }
        persist();
        m_terminal = complete || m_events.size() == MaxEvents;
        return true;
    }

    auto ObservationWriter::fail(std::string reason) noexcept -> void
    {
        if (m_terminal)
        {
            return;
        }
        m_status = "failed";
        m_status_reason = std::move(reason);
        m_finished_at = utc_now();
        m_terminal = true;
        try
        {
            persist();
        }
        catch (...)
        {
        }
    }

    auto ObservationWriter::abort(std::string reason) noexcept -> void
    {
        if (m_terminal)
        {
            return;
        }
        m_status = "aborted";
        m_status_reason = std::move(reason);
        m_finished_at = utc_now();
        m_terminal = true;
        try
        {
            persist();
        }
        catch (...)
        {
        }
    }

    auto ObservationWriter::is_terminal() const -> bool
    {
        return m_terminal;
    }

    auto ObservationWriter::output_path() const -> const std::filesystem::path&
    {
        return m_observation_path;
    }

    auto ObservationWriter::utc_now() -> std::string
    {
        const auto now = std::chrono::system_clock::now();
        const auto milliseconds = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()) % 1000;
        const auto time = std::chrono::system_clock::to_time_t(now);
        std::tm utc{};
        gmtime_s(&utc, &time);
        std::ostringstream output;
        output << std::put_time(&utc, "%Y-%m-%dT%H:%M:%S") << '.' << std::setw(3) << std::setfill('0') << milliseconds.count() << 'Z';
        return output.str();
    }

    auto ObservationWriter::persist() -> void
    {
        const auto json = serialize();
        glz::generic parsed;
        if (const auto error = glz::read_json(parsed, json); error)
        {
            throw std::runtime_error{"Collector generated invalid JSON."};
        }
        write_atomic(m_observation_path, json);
        const auto bytes = std::span{reinterpret_cast<const std::uint8_t*>(json.data()), json.size()};
        const auto digest = sha256(bytes);
        write_atomic(m_observation_path.parent_path() / HashFileName, digest + "  movie-return-observation.json\n");
    }

    auto ObservationWriter::serialize() const -> std::string
    {
        std::ostringstream output;
        output << "{\"artifactType\":\"movie-return-runtime-observation\",\"build\":{\"steamAppId\":" << json_string(m_config.build.steamAppId)
               << ",\"steamBuildId\":" << json_string(m_config.build.steamBuildId) << "},\"targetMechanics\":{\"fileName\":"
               << json_string(m_config.targetMechanics.fileName) << ",\"sizeBytes\":" << m_config.targetMechanics.sizeBytes << ",\"sha256\":"
               << json_string(m_config.targetMechanics.sha256) << ",\"artifactType\":" << json_string(m_config.targetMechanics.artifactType)
               << "},\"collector\":{\"name\":" << json_string(CollectorName) << ",\"version\":" << json_string(CollectorVersion)
               << ",\"runtimeHost\":{\"name\":" << json_string(RuntimeHostName) << ",\"version\":" << json_string(RuntimeHostVersion)
               << "}},\"run\":{\"runId\":" << json_string(m_run_id) << ",\"startedAtUtc\":" << json_string(m_started_at) << ",\"finishedAtUtc\":";
        if (m_finished_at)
        {
            output << json_string(*m_finished_at);
        }
        else
        {
            output << "null";
        }
        output << ",\"status\":" << json_string(m_status) << ",\"statusReason\":";
        if (m_status_reason)
        {
            output << json_string(*m_status_reason);
        }
        else
        {
            output << "null";
        }
        output << "},\"events\":[";
        for (std::size_t index = 0; index < m_events.size(); ++index)
        {
            if (index)
            {
                output << ',';
            }
            const auto& event = m_events[index];
            output << "{\"sequence\":" << event.sequence << ",\"eventType\":";
            switch (event.kind)
            {
            case EventKind::Readiness: output << "\"readiness-observed\""; break;
            case EventKind::Selection: output << "\"selection-observed\""; break;
            case EventKind::CustomerReturn: output << "\"customer-return-observed\""; break;
            }
            output << ",\"observedAtUtc\":" << json_string(event.observedAtUtc) << ",\"classPath\":" << json_string(event.classPath)
                   << ",\"objectPath\":" << json_string(event.objectPath) << ",\"functionPath\":" << json_string(event.functionPath) << ",\"preState\":";
            if (event.kind == EventKind::CustomerReturn)
            {
                output << serialize_customer(event.preCustomer) << ",\"result\":" << serialize_result(event.result)
                       << ",\"postState\":" << serialize_customer(event.postCustomer);
            }
            else
            {
                output << serialize_queues(event.preQueues);
                if (event.kind == EventKind::Readiness)
                {
                    output << ",\"postState\":" << serialize_queues(event.postQueues);
                }
                else
                {
                    output << ",\"result\":" << serialize_result(event.result);
                }
            }
            output << '}';
        }
        output << "]}\n";
        return output.str();
    }

    auto ObservationWriter::has_all_required_events() const -> bool
    {
        const auto has = [this](const EventKind kind) {
            return std::ranges::any_of(m_events, [kind](const ObservationEvent& event) { return event.kind == kind; });
        };
        return has(EventKind::Readiness) && has(EventKind::Selection) && has(EventKind::CustomerReturn);
    }
}
