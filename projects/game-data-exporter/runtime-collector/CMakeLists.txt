cmake_minimum_required(VERSION 3.22)

project(NeonRewindRuntimeCollector LANGUAGES CXX)

set(
    NEONREWIND_UE4SS_SOURCE
    ""
    CACHE PATH
    "Path to the RE-UE4SS source tree at the pinned NeonRewind commit")

set(
    NEONREWIND_UE4SS_COMMIT
    "662df91503379fc383bc745f7ade795d7b2ca215"
    CACHE INTERNAL
    "RE-UE4SS commit used by the proven runtime host")

if(NOT IS_DIRECTORY "${NEONREWIND_UE4SS_SOURCE}")
    message(FATAL_ERROR "NEONREWIND_UE4SS_SOURCE must identify an existing RE-UE4SS source directory.")
endif()

find_package(Git REQUIRED)
execute_process(
    COMMAND "${GIT_EXECUTABLE}" rev-parse HEAD
    WORKING_DIRECTORY "${NEONREWIND_UE4SS_SOURCE}"
    RESULT_VARIABLE ue4ss_revision_result
    OUTPUT_VARIABLE ue4ss_revision
    OUTPUT_STRIP_TRAILING_WHITESPACE)

if(NOT ue4ss_revision_result EQUAL 0 OR NOT ue4ss_revision STREQUAL NEONREWIND_UE4SS_COMMIT)
    message(FATAL_ERROR "RE-UE4SS must be checked out at ${NEONREWIND_UE4SS_COMMIT}.")
endif()

add_subdirectory(
    "${NEONREWIND_UE4SS_SOURCE}"
    "${CMAKE_BINARY_DIR}/ue4ss"
    EXCLUDE_FROM_ALL)

add_subdirectory(NeonRewindMovieReturnCollector)
