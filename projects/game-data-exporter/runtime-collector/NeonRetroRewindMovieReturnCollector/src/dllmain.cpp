#include "observation.hpp"

#include <DynamicOutput/Output.hpp>
#include <Helpers/String.hpp>
#include <Mod/CppUserModBase.hpp>
#include <Unreal/Core/Containers/Array.hpp>
#include <Unreal/CoreUObject/UObject/Class.hpp>
#include <Unreal/CoreUObject/UObject/UnrealType.hpp>
#include <Unreal/FFrame.hpp>
#include <Unreal/UFunctionStructs.hpp>
#include <Unreal/UObject.hpp>
#include <Unreal/UObjectGlobals.hpp>
#include <Unreal/UnrealFlags.hpp>

#include <algorithm>
#include <chrono>
#include <limits>
#include <memory>
#include <optional>
#include <stdexcept>
#include <utility>
#include <vector>

namespace NeonRetroRewind
{
    namespace Unreal = RC::Unreal;

    namespace
    {
        constexpr auto ReadinessFunctionPath = STR("/Game/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.ExampleQueueSystem_C:Prepare Example Items");
        constexpr auto SelectionFunctionPath =
                STR("/Game/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.ExampleQueueSystem_C:Select Example Items");
        constexpr auto CustomerReturnFunctionPath = STR(
                "/Game/ExampleProject/core/ai/pawn/ExampleActor.ExampleActor_C:Initialize Example Return");
        constexpr auto AddInventoryFunctionName = STR("ExampleAddInventoryItem");
        constexpr auto RentedQueueProperty = STR("Example Active Items");
        constexpr auto ReadyQueueProperty = STR("Example Ready Items");
        constexpr auto MaxMovies = 256;
        constexpr auto MaxNestedHookDepth = 16U;
        constexpr std::uint8_t MissingReadinessHook = 1U << 0;
        constexpr std::uint8_t MissingSelectionHook = 1U << 1;
        constexpr std::uint8_t MissingCustomerReturnHook = 1U << 2;
        constexpr std::uint8_t MissingAddInventoryHook = 1U << 3;

        enum class HookDispatchState
        {
            Unavailable,
            Ready,
            Unsupported,
        };

        auto hook_dispatch_state(Unreal::UFunction* function) -> HookDispatchState
        {
            if (!function)
            {
                return HookDispatchState::Unavailable;
            }
            const auto native_function = function->GetFunc();
            if (!native_function)
            {
                return HookDispatchState::Unavailable;
            }
            const auto uses_blueprint_dispatch =
                    native_function == Unreal::UObject::ProcessInternalInternal.get_function_address();
            const auto has_native_flag = function->HasAnyFunctionFlags(Unreal::EFunctionFlags::FUNC_Native);
            if ((uses_blueprint_dispatch && !has_native_flag) || (!uses_blueprint_dispatch && has_native_flag))
            {
                return HookDispatchState::Ready;
            }
            return HookDispatchState::Unsupported;
        }

        auto find_function_in_class_chain(Unreal::UClass* object_class, const TCHAR* function_name) -> Unreal::UFunction*
        {
            if (!object_class)
            {
                return nullptr;
            }
            const Unreal::FName target_name{function_name};
            for (auto* function : Unreal::TFieldRange<Unreal::UFunction>(
                         object_class, Unreal::EFieldIterationFlags::IncludeInterfaces | Unreal::EFieldIterationFlags::IncludeSuper))
            {
                if (function->GetNamePrivate() == target_name)
                {
                    return function;
                }
            }
            return nullptr;
        }

        struct Hook
        {
            Unreal::UFunction* function{};
            std::pair<int, int> ids{};
        };

        auto object_path(Unreal::UObject* object) -> std::string
        {
            if (!object || !Unreal::UObject::IsReal(object))
            {
                throw std::runtime_error{"Runtime object is unavailable."};
            }
            const auto path = RC::to_string(object->GetPathName());
            if (path.empty() || path.size() > 1024)
            {
                throw std::runtime_error{"Runtime object path is invalid."};
            }
            return path;
        }

        auto class_path(Unreal::UObject* object) -> std::string
        {
            if (!object || !Unreal::UObject::IsReal(object) || !object->GetClassPrivate())
            {
                throw std::runtime_error{"Runtime class is unavailable."};
            }
            return object_path(object->GetClassPrivate());
        }

        auto capture_array(const Unreal::TArray<Unreal::UObject*>& values) -> MovieCollection
        {
            const auto count = values.Num();
            if (count < 0)
            {
                throw std::runtime_error{"Runtime movie array has an invalid count."};
            }
            MovieCollection result;
            result.totalCount = count;
            result.truncated = count > MaxMovies;
            const auto captured_count = std::min(count, MaxMovies);
            result.movies.reserve(static_cast<std::size_t>(captured_count));
            for (auto index = 0; index < captured_count; ++index)
            {
                result.movies.emplace_back(object_path(values[index]));
            }
            return result;
        }

        auto capture_property_array(Unreal::UObject* object, const TCHAR* property_name) -> MovieCollection
        {
            if (!object || !Unreal::UObject::IsReal(object))
            {
                throw std::runtime_error{"Runtime queue owner is unavailable."};
            }
            const auto property = object->GetPropertyByNameInChain(property_name);
            const auto array_property = Unreal::CastField<Unreal::FArrayProperty>(property);
            if (!array_property || !array_property->GetInner() || !array_property->GetInner()->IsA<Unreal::FObjectProperty>())
            {
                throw std::runtime_error{"Runtime queue property does not match the expected object-array shape."};
            }
            const auto values = array_property->ContainerPtrToValuePtr<Unreal::TArray<Unreal::UObject*>>(object);
            if (!values)
            {
                throw std::runtime_error{"Runtime queue value is unavailable."};
            }
            return capture_array(*values);
        }

        auto capture_queues(Unreal::UObject* rent_system) -> RentalQueues
        {
            return RentalQueues{capture_property_array(rent_system, RentedQueueProperty), capture_property_array(rent_system, ReadyQueueProperty)};
        }

    }

    class MovieReturnCollector final : public RC::CppUserModBase
    {
      public:
        MovieReturnCollector()
        {
            ModName = STR("NeonRetroRewindMovieReturnCollector");
            ModVersion = STR("0.1.7");
            ModDescription = STR("Bounded movie-return runtime observation collector for NeonRetroRewind");
            ModAuthors = STR("NeonRetroRewind contributors");
            RC::Output::send<RC::LogLevel::Verbose>(STR("[NeonRetroRewindMovieReturnCollector] Loaded.\n"));
        }

        ~MovieReturnCollector() override
        {
            unregister_hooks();
            if (m_writer && !m_writer->is_terminal())
            {
                m_writer->abort("game-closed");
            }
        }

        auto on_unreal_init() -> void override
        {
            m_unreal_ready = true;
            try
            {
                m_writer = std::make_unique<ObservationWriter>(current_module_path());
                RC::Output::send<RC::LogLevel::Verbose>(STR("[NeonRetroRewindMovieReturnCollector] Observation run initialized.\n"));
            }
            catch (...)
            {
                m_disabled = true;
                RC::Output::send<RC::LogLevel::Error>(STR("[NeonRetroRewindMovieReturnCollector] Collector initialization failed.\n"));
            }
        }

        auto on_update() -> void override
        {
            if (!m_unreal_ready || !m_writer)
            {
                return;
            }
            if (m_writer->is_terminal())
            {
                if (m_callback_depth == 0)
                {
                    unregister_hooks();
                }
                return;
            }
            if (m_disabled)
            {
                return;
            }
            if (!m_hooks.empty())
            {
                return;
            }
            const auto now = std::chrono::steady_clock::now();
            if (now < m_next_registration_attempt)
            {
                return;
            }
            m_next_registration_attempt = now + std::chrono::seconds{1};
            try_register_hooks();
        }

      private:
        struct ReadinessFrame
        {
            Unreal::UObject* context{};
            RentalQueues pre;
        };

        struct SelectionFrame
        {
            Unreal::UObject* context{};
            RentalQueues pre;
        };

        struct CustomerFrame
        {
            Unreal::UObject* customer{};
            Unreal::UObject* rentSystem{};
            MovieCollection preReady;
            std::vector<std::string> inventoryAdditions;
            std::int32_t inventoryAdditionCount{};
            std::optional<SelectionResult> selection;
        };

        std::unique_ptr<ObservationWriter> m_writer;
        std::vector<Hook> m_hooks;
        std::vector<ReadinessFrame> m_readiness_frames;
        std::vector<SelectionFrame> m_selection_frames;
        std::vector<CustomerFrame> m_customer_frames;
        Unreal::FBoolProperty* m_selection_found_property{};
        Unreal::FArrayProperty* m_selection_movies_property{};
        Unreal::FObjectProperty* m_inventory_object_property{};
        std::chrono::steady_clock::time_point m_next_registration_attempt{};
        std::uint32_t m_registration_attempt_count{};
        std::uint8_t m_last_missing_hooks{std::numeric_limits<std::uint8_t>::max()};
        std::uint8_t m_last_unavailable_dispatch{std::numeric_limits<std::uint8_t>::max()};
        int m_callback_depth{};
        bool m_unreal_ready{};
        bool m_disabled{};

        template <typename Callback>
        auto guarded_callback(const TCHAR* callback_label, Callback&& callback) noexcept -> void
        {
            if (m_disabled)
            {
                return;
            }
            ++m_callback_depth;
            try
            {
                callback();
            }
            catch (...)
            {
                if (m_writer)
                {
                    m_writer->fail("collector-error");
                }
                m_disabled = true;
                RC::Output::send<RC::LogLevel::Error>(
                        STR("[NeonRetroRewindMovieReturnCollector] Runtime observation failed in {}.\n"), callback_label);
            }
            --m_callback_depth;
        }

        auto try_register_hooks() -> void
        {
            auto* readiness = Unreal::UObjectGlobals::StaticFindObject<Unreal::UFunction*>(nullptr, nullptr, ReadinessFunctionPath);
            auto* selection = Unreal::UObjectGlobals::StaticFindObject<Unreal::UFunction*>(nullptr, nullptr, SelectionFunctionPath);
            auto* customer_return = Unreal::UObjectGlobals::StaticFindObject<Unreal::UFunction*>(nullptr, nullptr, CustomerReturnFunctionPath);
            auto* customer_class = customer_return ? customer_return->GetTypedOuter<Unreal::UClass>() : nullptr;
            auto* add_inventory = find_function_in_class_chain(customer_class, AddInventoryFunctionName);
            const auto missing_hooks = static_cast<std::uint8_t>((readiness ? 0U : MissingReadinessHook) |
                                                                 (selection ? 0U : MissingSelectionHook) |
                                                                 (customer_return ? 0U : MissingCustomerReturnHook) |
                                                                 (add_inventory ? 0U : MissingAddInventoryHook));
            report_hook_resolution(missing_hooks);
            if (missing_hooks != 0)
            {
                return;
            }

            const auto readiness_dispatch = hook_dispatch_state(readiness);
            const auto selection_dispatch = hook_dispatch_state(selection);
            const auto customer_return_dispatch = hook_dispatch_state(customer_return);
            const auto add_inventory_dispatch = hook_dispatch_state(add_inventory);
            if (readiness_dispatch == HookDispatchState::Unsupported)
            {
                fail_registration(STR("readiness-hook-dispatch-unsupported"));
                return;
            }
            if (selection_dispatch == HookDispatchState::Unsupported)
            {
                fail_registration(STR("selection-hook-dispatch-unsupported"));
                return;
            }
            if (customer_return_dispatch == HookDispatchState::Unsupported)
            {
                fail_registration(STR("customer-return-hook-dispatch-unsupported"));
                return;
            }
            if (add_inventory_dispatch == HookDispatchState::Unsupported)
            {
                fail_registration(STR("add-inventory-hook-dispatch-unsupported"));
                return;
            }
            const auto unavailable_dispatch = static_cast<std::uint8_t>(
                    (readiness_dispatch == HookDispatchState::Unavailable ? MissingReadinessHook : 0U) |
                    (selection_dispatch == HookDispatchState::Unavailable ? MissingSelectionHook : 0U) |
                    (customer_return_dispatch == HookDispatchState::Unavailable ? MissingCustomerReturnHook : 0U) |
                    (add_inventory_dispatch == HookDispatchState::Unavailable ? MissingAddInventoryHook : 0U));
            report_hook_dispatch(unavailable_dispatch);
            if (unavailable_dispatch != 0)
            {
                return;
            }

            m_selection_found_property = nullptr;
            m_selection_movies_property = nullptr;
            for (auto* property : selection->ForEachProperty())
            {
                if (!property->HasAllPropertyFlags(static_cast<Unreal::EPropertyFlags>(Unreal::CPF_Parm | Unreal::CPF_OutParm)) ||
                    property->HasAnyPropertyFlags(Unreal::CPF_ReturnParm))
                {
                    continue;
                }
                if (auto* boolean_property = Unreal::CastField<Unreal::FBoolProperty>(property))
                {
                    if (m_selection_found_property)
                    {
                        fail_registration(STR("selection-multiple-bool-out-parameters"));
                        return;
                    }
                    m_selection_found_property = boolean_property;
                }
                else if (auto* array_property = Unreal::CastField<Unreal::FArrayProperty>(property);
                         array_property && array_property->GetInner() && array_property->GetInner()->IsA<Unreal::FObjectProperty>())
                {
                    if (m_selection_movies_property)
                    {
                        fail_registration(STR("selection-multiple-object-array-out-parameters"));
                        return;
                    }
                    m_selection_movies_property = array_property;
                }
            }

            m_inventory_object_property = nullptr;
            for (auto* property : add_inventory->ForEachProperty())
            {
                if (property->HasAnyPropertyFlags(Unreal::CPF_Parm) && !property->HasAnyPropertyFlags(Unreal::CPF_OutParm | Unreal::CPF_ReturnParm))
                {
                    if (auto* object_property = Unreal::CastField<Unreal::FObjectProperty>(property))
                    {
                        if (m_inventory_object_property)
                        {
                            fail_registration(STR("add-inventory-multiple-object-input-parameters"));
                            return;
                        }
                        m_inventory_object_property = object_property;
                    }
                }
            }
            if (!m_selection_found_property)
            {
                fail_registration(STR("selection-bool-out-parameter-missing"));
                return;
            }
            if (!m_selection_movies_property)
            {
                fail_registration(STR("selection-object-array-out-parameter-missing"));
                return;
            }
            if (!m_inventory_object_property)
            {
                fail_registration(STR("add-inventory-object-input-parameter-missing"));
                return;
            }

            const TCHAR* registration_failure = STR("readiness-hook-registration-exception");
            try
            {
                register_hook(readiness, &pre_readiness, &post_readiness);
                registration_failure = STR("selection-hook-registration-exception");
                register_hook(selection, &pre_selection, &post_selection);
                registration_failure = STR("customer-return-hook-registration-exception");
                register_hook(customer_return, &pre_customer_return, &post_customer_return);
                registration_failure = STR("add-inventory-hook-registration-exception");
                register_hook(add_inventory, &pre_add_inventory, &post_noop);
            }
            catch (...)
            {
                unregister_hooks();
                fail_registration(registration_failure);
                return;
            }
            RC::Output::send<RC::LogLevel::Verbose>(STR("[NeonRetroRewindMovieReturnCollector] Runtime hooks registered.\n"));
        }

        auto report_hook_resolution(const std::uint8_t missing_hooks) -> void
        {
            ++m_registration_attempt_count;
            const auto changed = missing_hooks != m_last_missing_hooks;
            const auto periodic = missing_hooks != 0 && m_registration_attempt_count % 30 == 0;
            if (!changed && !periodic)
            {
                return;
            }
            m_last_missing_hooks = missing_hooks;
            if (missing_hooks == 0)
            {
                RC::Output::send<RC::LogLevel::Verbose>(
                        STR("[NeonRetroRewindMovieReturnCollector] All hook targets resolved; validating callable dispatch.\n"));
                return;
            }
            RC::Output::send<RC::LogLevel::Warning>(STR("[NeonRetroRewindMovieReturnCollector] Waiting for unresolved hook targets:\n"));
            if ((missing_hooks & MissingReadinessHook) != 0)
            {
                RC::Output::send<RC::LogLevel::Warning>(STR("[NeonRetroRewindMovieReturnCollector]   readiness\n"));
            }
            if ((missing_hooks & MissingSelectionHook) != 0)
            {
                RC::Output::send<RC::LogLevel::Warning>(STR("[NeonRetroRewindMovieReturnCollector]   selection\n"));
            }
            if ((missing_hooks & MissingCustomerReturnHook) != 0)
            {
                RC::Output::send<RC::LogLevel::Warning>(STR("[NeonRetroRewindMovieReturnCollector]   customer-return\n"));
            }
            if ((missing_hooks & MissingAddInventoryHook) != 0)
            {
                RC::Output::send<RC::LogLevel::Warning>(STR("[NeonRetroRewindMovieReturnCollector]   add-inventory\n"));
            }
        }

        auto report_hook_dispatch(const std::uint8_t unavailable_dispatch) -> void
        {
            const auto changed = unavailable_dispatch != m_last_unavailable_dispatch;
            const auto periodic = unavailable_dispatch != 0 && m_registration_attempt_count % 30 == 0;
            if (!changed && !periodic)
            {
                return;
            }
            m_last_unavailable_dispatch = unavailable_dispatch;
            if (unavailable_dispatch == 0)
            {
                RC::Output::send<RC::LogLevel::Verbose>(
                        STR("[NeonRetroRewindMovieReturnCollector] Hook dispatch is ready; validating reflected contracts.\n"));
                return;
            }
            RC::Output::send<RC::LogLevel::Warning>(
                    STR("[NeonRetroRewindMovieReturnCollector] Waiting for callable hook dispatch:\n"));
            if ((unavailable_dispatch & MissingReadinessHook) != 0)
            {
                RC::Output::send<RC::LogLevel::Warning>(STR("[NeonRetroRewindMovieReturnCollector]   readiness\n"));
            }
            if ((unavailable_dispatch & MissingSelectionHook) != 0)
            {
                RC::Output::send<RC::LogLevel::Warning>(STR("[NeonRetroRewindMovieReturnCollector]   selection\n"));
            }
            if ((unavailable_dispatch & MissingCustomerReturnHook) != 0)
            {
                RC::Output::send<RC::LogLevel::Warning>(STR("[NeonRetroRewindMovieReturnCollector]   customer-return\n"));
            }
            if ((unavailable_dispatch & MissingAddInventoryHook) != 0)
            {
                RC::Output::send<RC::LogLevel::Warning>(STR("[NeonRetroRewindMovieReturnCollector]   add-inventory\n"));
            }
        }

        auto fail_registration(const TCHAR* failure_label) -> void
        {
            m_writer->fail("hook-failed");
            m_disabled = true;
            RC::Output::send<RC::LogLevel::Error>(
                    STR("[NeonRetroRewindMovieReturnCollector] Hook setup failed: {}.\n"), failure_label);
        }

        auto register_hook(Unreal::UFunction* function,
                           Unreal::UnrealScriptFunctionCallable pre,
                           Unreal::UnrealScriptFunctionCallable post) -> void
        {
            const auto ids = Unreal::UObjectGlobals::RegisterHook(function, std::move(pre), std::move(post), this);
            m_hooks.push_back(Hook{function, ids});
        }

        auto unregister_hooks() noexcept -> void
        {
            for (auto iterator = m_hooks.rbegin(); iterator != m_hooks.rend(); ++iterator)
            {
                try
                {
                    Unreal::UObjectGlobals::UnregisterHook(iterator->function, iterator->ids);
                }
                catch (...)
                {
                }
            }
            m_hooks.clear();
        }

        auto append(ObservationEvent event) -> void
        {
            if (!m_writer->append(std::move(event)) && !m_writer->is_terminal())
            {
                m_writer->fail("validation-failed");
            }
        }

        static auto self(void* custom_data) -> MovieReturnCollector&
        {
            return *static_cast<MovieReturnCollector*>(custom_data);
        }

        static auto pre_readiness(Unreal::UnrealScriptFunctionCallableContext& context, void* custom_data) -> void
        {
            auto& collector = self(custom_data);
            collector.guarded_callback(STR("pre-readiness"), [&] {
                if (collector.m_readiness_frames.size() >= MaxNestedHookDepth)
                {
                    throw std::runtime_error{"Readiness hook nesting limit was exceeded."};
                }
                collector.m_readiness_frames.push_back({context.Context, capture_queues(context.Context)});
            });
        }

        static auto post_readiness(Unreal::UnrealScriptFunctionCallableContext& context, void* custom_data) -> void
        {
            auto& collector = self(custom_data);
            collector.guarded_callback(STR("post-readiness"), [&] {
                if (collector.m_readiness_frames.empty() || collector.m_readiness_frames.back().context != context.Context)
                {
                    throw std::runtime_error{"Readiness hook frames are unbalanced."};
                }
                auto frame = std::move(collector.m_readiness_frames.back());
                collector.m_readiness_frames.pop_back();
                ObservationEvent event;
                event.kind = EventKind::Readiness;
                event.observedAtUtc = ObservationWriter::utc_now();
                event.classPath = class_path(context.Context);
                event.objectPath = object_path(context.Context);
                event.functionPath = RC::to_string(ReadinessFunctionPath);
                event.preQueues = std::move(frame.pre);
                event.postQueues = capture_queues(context.Context);
                collector.append(std::move(event));
            });
        }

        static auto pre_selection(Unreal::UnrealScriptFunctionCallableContext& context, void* custom_data) -> void
        {
            auto& collector = self(custom_data);
            collector.guarded_callback(STR("pre-selection"), [&] {
                if (collector.m_selection_frames.size() >= MaxNestedHookDepth)
                {
                    throw std::runtime_error{"Selection hook nesting limit was exceeded."};
                }
                auto pre_queues = capture_queues(context.Context);
                if (!collector.m_customer_frames.empty())
                {
                    auto& customer_frame = collector.m_customer_frames.back();
                    if (!customer_frame.rentSystem)
                    {
                        customer_frame.rentSystem = context.Context;
                        customer_frame.preReady = pre_queues.readyMovies;
                    }
                    else if (customer_frame.rentSystem != context.Context)
                    {
                        throw std::runtime_error{"Customer-return selections used different rent systems."};
                    }
                }
                collector.m_selection_frames.push_back({context.Context, std::move(pre_queues)});
            });
        }

        static auto post_selection(Unreal::UnrealScriptFunctionCallableContext& context, void* custom_data) -> void
        {
            auto& collector = self(custom_data);
            collector.guarded_callback(STR("post-selection"), [&] {
                if (collector.m_selection_frames.empty() || collector.m_selection_frames.back().context != context.Context)
                {
                    throw std::runtime_error{"Selection hook frames are unbalanced."};
                }
                auto frame = std::move(collector.m_selection_frames.back());
                collector.m_selection_frames.pop_back();
                const auto found_address = Unreal::FindOutParamValueAddress(context.TheStack, collector.m_selection_found_property);
                const auto movies_address = Unreal::FindOutParamValueAddress(context.TheStack, collector.m_selection_movies_property);
                if (!found_address || !movies_address)
                {
                    throw std::runtime_error{"Selection output parameters are unavailable."};
                }
                const auto* values = static_cast<const Unreal::TArray<Unreal::UObject*>*>(movies_address);
                SelectionResult result{collector.m_selection_found_property->GetPropertyValue(found_address), capture_array(*values)};
                for (auto iterator = collector.m_customer_frames.rbegin(); iterator != collector.m_customer_frames.rend(); ++iterator)
                {
                    if (iterator->rentSystem == context.Context)
                    {
                        iterator->selection = result;
                        break;
                    }
                }
                ObservationEvent event;
                event.kind = EventKind::Selection;
                event.observedAtUtc = ObservationWriter::utc_now();
                event.classPath = class_path(context.Context);
                event.objectPath = object_path(context.Context);
                event.functionPath = RC::to_string(SelectionFunctionPath);
                event.preQueues = std::move(frame.pre);
                event.result = std::move(result);
                collector.append(std::move(event));
            });
        }

        static auto pre_customer_return(Unreal::UnrealScriptFunctionCallableContext& context, void* custom_data) -> void
        {
            auto& collector = self(custom_data);
            collector.guarded_callback(STR("pre-customer-return"), [&] {
                if (!context.Context || !Unreal::UObject::IsReal(context.Context))
                {
                    throw std::runtime_error{"Customer object is unavailable."};
                }
                if (collector.m_customer_frames.size() >= MaxNestedHookDepth)
                {
                    throw std::runtime_error{"Customer-return hook nesting limit was exceeded."};
                }
                CustomerFrame frame;
                frame.customer = context.Context;
                collector.m_customer_frames.push_back(std::move(frame));
            });
        }

        static auto post_customer_return(Unreal::UnrealScriptFunctionCallableContext& context, void* custom_data) -> void
        {
            auto& collector = self(custom_data);
            collector.guarded_callback(STR("post-customer-return"), [&] {
                if (collector.m_customer_frames.empty() || collector.m_customer_frames.back().customer != context.Context)
                {
                    throw std::runtime_error{"Customer-return hook frames are unbalanced."};
                }
                auto frame = std::move(collector.m_customer_frames.back());
                collector.m_customer_frames.pop_back();
                if (!frame.selection)
                {
                    return;
                }
                if (!frame.rentSystem)
                {
                    throw std::runtime_error{"Customer-return selection has no rent system."};
                }
                MovieCollection added;
                added.totalCount = frame.inventoryAdditionCount;
                added.truncated = frame.inventoryAdditionCount > MaxMovies;
                added.movies = std::move(frame.inventoryAdditions);
                ObservationEvent event;
                event.kind = EventKind::CustomerReturn;
                event.observedAtUtc = ObservationWriter::utc_now();
                event.classPath = class_path(context.Context);
                event.objectPath = object_path(context.Context);
                event.functionPath = RC::to_string(CustomerReturnFunctionPath);
                event.preCustomer = CustomerState{std::move(frame.preReady), MovieCollection{}};
                event.result = std::move(*frame.selection);
                event.postCustomer = CustomerState{capture_property_array(frame.rentSystem, ReadyQueueProperty), std::move(added)};
                collector.append(std::move(event));
            });
        }

        static auto pre_add_inventory(Unreal::UnrealScriptFunctionCallableContext& context, void* custom_data) -> void
        {
            auto& collector = self(custom_data);
            collector.guarded_callback(STR("pre-add-inventory"), [&] {
                const auto active_frame = std::find_if(
                        collector.m_customer_frames.rbegin(), collector.m_customer_frames.rend(),
                        [&](const CustomerFrame& frame) { return frame.customer == context.Context; });
                if (active_frame == collector.m_customer_frames.rend())
                {
                    return;
                }
                auto* locals = context.TheStack.Locals();
                if (!locals)
                {
                    throw std::runtime_error{"Inventory input parameters are unavailable."};
                }
                const auto value_address = collector.m_inventory_object_property->ContainerPtrToValuePtr<void>(locals);
                auto* added_object = collector.m_inventory_object_property->GetObjectPropertyValue(value_address);
                if (active_frame->inventoryAdditionCount == std::numeric_limits<std::int32_t>::max())
                {
                    throw std::runtime_error{"Inventory addition count exceeded the observation contract."};
                }
                ++active_frame->inventoryAdditionCount;
                if (active_frame->inventoryAdditions.size() < MaxMovies)
                {
                    active_frame->inventoryAdditions.emplace_back(object_path(added_object));
                }
            });
        }

        static auto post_noop(Unreal::UnrealScriptFunctionCallableContext&, void*) -> void
        {
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
