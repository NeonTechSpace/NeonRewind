#pragma once

#include <cstdint>
#include <filesystem>
#include <optional>
#include <string>
#include <vector>

namespace NeonRetroRewind
{
    inline constexpr auto CollectorName = "NeonRetroRewind.MovieReturnRuntimeCollector";
    inline constexpr auto CollectorVersion = "0.1.0";
    inline constexpr auto RuntimeHostName = "UE4SS";
    inline constexpr auto RuntimeHostVersion = "3.0.1-1018-g662df915";

    struct FileIdentity
    {
        std::string fileName;
        std::uint64_t sizeBytes{};
        std::string sha256;
    };

    struct BuildIdentity
    {
        std::string steamAppId;
        std::string steamBuildId;
    };

    struct TargetMechanicsIdentity
    {
        std::string fileName;
        std::uint64_t sizeBytes{};
        std::string sha256;
        std::string artifactType;
    };

    struct CollectorIdentity
    {
        std::string name;
        std::string version;
    };

    struct RuntimeHostIdentity
    {
        std::string name;
        std::string version;
    };

    struct ObservationSchemaIdentity
    {
        std::string fileName;
        std::uint64_t sizeBytes{};
        std::string sha256;
        std::string stagedRelativePath;
    };

    struct CollectorConfig
    {
        std::string artifactType;
        BuildIdentity build;
        TargetMechanicsIdentity targetMechanics;
        CollectorIdentity collector;
        RuntimeHostIdentity runtimeHost;
        ObservationSchemaIdentity observationSchema;
        std::string observationOutputRootAbsolutePath;
    };

    struct MovieCollection
    {
        std::int32_t totalCount{};
        bool truncated{};
        std::vector<std::string> movies;
    };

    struct RentalQueues
    {
        MovieCollection rentedMovies;
        MovieCollection readyMovies;
    };

    struct CustomerState
    {
        MovieCollection readyMovies;
        MovieCollection customerInventoryMovies;
    };

    struct SelectionResult
    {
        bool found{};
        MovieCollection selectedMovies;
    };

    enum class EventKind
    {
        Readiness,
        Selection,
        CustomerReturn,
    };

    struct ObservationEvent
    {
        EventKind kind{};
        std::int32_t sequence{};
        std::string observedAtUtc;
        std::string classPath;
        std::string objectPath;
        std::string functionPath;
        RentalQueues preQueues;
        RentalQueues postQueues;
        CustomerState preCustomer;
        CustomerState postCustomer;
        SelectionResult result;
    };

    class ObservationWriter
    {
      public:
        explicit ObservationWriter(const std::filesystem::path& modulePath);
        ~ObservationWriter();

        ObservationWriter(const ObservationWriter&) = delete;
        ObservationWriter& operator=(const ObservationWriter&) = delete;
        ObservationWriter(ObservationWriter&&) = delete;
        ObservationWriter& operator=(ObservationWriter&&) = delete;

        auto append(ObservationEvent event) -> bool;
        auto fail(std::string reason) noexcept -> void;
        auto abort(std::string reason) noexcept -> void;
        [[nodiscard]] auto is_terminal() const -> bool;
        [[nodiscard]] auto output_path() const -> const std::filesystem::path&;

        static auto utc_now() -> std::string;

      private:
        CollectorConfig m_config;
        std::string m_run_id;
        std::string m_started_at;
        std::optional<std::string> m_finished_at;
        std::string m_status{"aborted"};
        std::optional<std::string> m_status_reason{"unknown"};
        std::vector<ObservationEvent> m_events;
        std::filesystem::path m_observation_path;
        bool m_terminal{};

        auto persist() -> void;
        auto serialize() const -> std::string;
        auto has_all_required_events() const -> bool;
    };

    auto current_module_path() -> std::filesystem::path;
}
