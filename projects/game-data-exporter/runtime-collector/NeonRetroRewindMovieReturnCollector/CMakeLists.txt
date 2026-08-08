set(TARGET NeonRetroRewindMovieReturnCollector)

add_library(${TARGET} SHARED src/dllmain.cpp)

target_compile_features(${TARGET} PRIVATE cxx_std_23)
target_link_libraries(${TARGET} PRIVATE UE4SS)

set_target_properties(
    ${TARGET}
    PROPERTIES
        OUTPUT_NAME main
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/artifact/NeonRetroRewindMovieReturnCollector/dlls")
