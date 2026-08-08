#include <DynamicOutput/Output.hpp>
#include <Mod/CppUserModBase.hpp>

namespace NeonRetroRewind
{
    class MovieReturnCollector final : public RC::CppUserModBase
    {
      public:
        MovieReturnCollector()
        {
            ModName = STR("NeonRetroRewindMovieReturnCollector");
            ModVersion = STR("0.0.1");
            ModDescription = STR("Load-only scaffold for the NeonRetroRewind movie-return observation collector");
            ModAuthors = STR("NeonRetroRewind contributors");

            RC::Output::send<RC::LogLevel::Verbose>(STR("[NeonRetroRewindMovieReturnCollector] Loaded.\n"));
        }

        auto on_unreal_init() -> void override
        {
            RC::Output::send<RC::LogLevel::Verbose>(STR("[NeonRetroRewindMovieReturnCollector] Unreal initialized.\n"));
        }
    };
}

#define NEONRETROREWIND_MOD_API __declspec(dllexport)

extern "C"
{
    NEONRETROREWIND_MOD_API RC::CppUserModBase* start_mod()
    {
        return new NeonRetroRewind::MovieReturnCollector();
    }

    NEONRETROREWIND_MOD_API void uninstall_mod(RC::CppUserModBase* mod)
    {
        delete mod;
    }
}
