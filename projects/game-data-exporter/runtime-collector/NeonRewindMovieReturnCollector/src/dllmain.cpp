#include <DynamicOutput/Output.hpp>
#include <Mod/CppUserModBase.hpp>

namespace NeonRewind
{
    class MovieReturnCollector final : public RC::CppUserModBase
    {
      public:
        MovieReturnCollector()
        {
            ModName = STR("NeonRewindMovieReturnCollector");
            ModVersion = STR("0.0.1");
            ModDescription = STR("Load-only scaffold for the NeonRewind movie-return observation collector");
            ModAuthors = STR("NeonRewind contributors");

            RC::Output::send<RC::LogLevel::Verbose>(STR("[NeonRewindMovieReturnCollector] Loaded.\n"));
        }

        auto on_unreal_init() -> void override
        {
            RC::Output::send<RC::LogLevel::Verbose>(STR("[NeonRewindMovieReturnCollector] Unreal initialized.\n"));
        }
    };
}

#define NEONREWIND_MOD_API __declspec(dllexport)

extern "C"
{
    NEONREWIND_MOD_API RC::CppUserModBase* start_mod()
    {
        return new NeonRewind::MovieReturnCollector();
    }

    NEONREWIND_MOD_API void uninstall_mod(RC::CppUserModBase* mod)
    {
        delete mod;
    }
}
