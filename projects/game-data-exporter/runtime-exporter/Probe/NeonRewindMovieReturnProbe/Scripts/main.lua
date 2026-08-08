local Config = require("config")

local MAX_ARRAY_ELEMENTS = 16
local MAX_CUSTOMERS = 8
local MAX_ERRORS = 32
local MAX_HOOK_CALLBACKS = 32
local RUNTIME_SCAN_INTERVAL_MS = 5000
local MAX_RUNTIME_SCAN_ATTEMPTS = 120

local RENT_CLASS = "/Game/VideoStore/core/blueprint/RentSystem/RentSystem.RentSystem_C"
local CUSTOMER_CLASS = "/Game/VideoStore/core/ai/pawn/AI_Client_Character.AI_Client_Character_C"
local CUSTOMER_PROPERTY_CANDIDATES = {
    "ref to Rent system",
    "current Console in loop",
    "current Cartridge in loop",
    "Is Holding something",
}

local function json_object(value)
    return { json_kind = "object", value = value }
end

local function json_array(value)
    return { json_kind = "array", value = value }
end

local function encode_string(value)
    return '"' .. value:gsub('[%z\1-\31\\"]', function(character)
        local replacements = {
            ['"'] = '\\"',
            ['\\'] = '\\\\',
            ['\b'] = '\\b',
            ['\f'] = '\\f',
            ['\n'] = '\\n',
            ['\r'] = '\\r',
            ['\t'] = '\\t',
        }
        return replacements[character] or string.format("\\u%04x", string.byte(character))
    end) .. '"'
end

local function encode_json(value)
    local value_type = type(value)
    if value_type == "nil" then
        return "null"
    end
    if value_type == "boolean" or value_type == "number" then
        return tostring(value)
    end
    if value_type == "string" then
        return encode_string(value)
    end
    if value_type ~= "table" or value.json_kind == nil then
        error("JSON values must use an explicit object or array wrapper")
    end

    if value.json_kind == "array" then
        local encoded = {}
        for index, item in ipairs(value.value) do
            encoded[index] = encode_json(item)
        end
        return "[" .. table.concat(encoded, ",") .. "]"
    end

    if value.json_kind == "object" then
        local keys = {}
        for key, _ in pairs(value.value) do
            table.insert(keys, key)
        end
        table.sort(keys)

        local encoded = {}
        for index, key in ipairs(keys) do
            encoded[index] = encode_string(key) .. ":" .. encode_json(value.value[key])
        end
        return "{" .. table.concat(encoded, ",") .. "}"
    end

    error("Unknown JSON wrapper")
end

local report = {
    artifactType = "movie-return-runtime-compatibility-probe",
    schemaVersion = 1,
    build = json_object({
        steamAppId = Config.steam_app_id,
        steamBuildId = Config.steam_build_id,
    }),
    probe = json_object({
        name = Config.probe_name,
        version = Config.probe_version,
    }),
    status = "collecting",
    evidenceEligible = false,
    startedUtc = os.date("!%Y-%m-%dT%H:%M:%SZ"),
    updatedUtc = os.date("!%Y-%m-%dT%H:%M:%SZ"),
    rentalManager = json_object({
        found = false,
        objectPath = nil,
        queues = json_object({}),
    }),
    customers = json_object({
        instancesFound = 0,
        recordedObjectPaths = json_array({}),
        relevantClassProperties = json_array({}),
        unreadablePropertyNames = json_array({}),
        propertiesVisited = 0,
        propertiesUnreadable = 0,
        propertiesScanned = false,
    }),
    hooks = json_array({}),
    runtimeScan = json_object({
        intervalMilliseconds = RUNTIME_SCAN_INTERVAL_MS,
        maximumAttempts = MAX_RUNTIME_SCAN_ATTEMPTS,
        attempts = 0,
        active = false,
        stopReason = nil,
    }),
    errors = json_array({}),
    limits = json_object({
        maximumArrayElementsPerQueue = MAX_ARRAY_ELEMENTS,
        maximumCustomers = MAX_CUSTOMERS,
        maximumCustomerProperties = #CUSTOMER_PROPERTY_CANDIDATES,
        maximumErrors = MAX_ERRORS,
        maximumCallbacksPerHook = MAX_HOOK_CALLBACKS,
    }),
    limitations = json_array({
        "Blueprint RegisterHook callbacks are post-call only.",
        "Generic native array helpers are not hooked because they are shared by unrelated gameplay.",
        "This diagnostic is not a runtime observation and cannot validate a mechanic.",
    }),
}

local hook_states = {}
local rental_manager = nil
local customer_paths = {}

local function bounded_text(value)
    local text = tostring(value)
    if #text > 256 then
        return text:sub(1, 256)
    end
    return text
end

local function add_error(scope, message)
    local errors = report.errors.value
    if #errors >= MAX_ERRORS then
        return
    end
    table.insert(errors, json_object({ scope = scope, message = bounded_text(message) }))
end

local function write_report()
    report.updatedUtc = os.date("!%Y-%m-%dT%H:%M:%SZ")
    local temporary_path = Config.output_path .. ".tmp"
    local file, open_error = io.open(temporary_path, "wb")
    if not file then
        print(string.format("[%s] Could not open diagnostic output: %s\n", Config.probe_name, bounded_text(open_error)))
        return
    end

    local ok, encoded_or_error = pcall(encode_json, json_object(report))
    if not ok then
        file:close()
        os.remove(temporary_path)
        print(string.format("[%s] Could not encode diagnostic output: %s\n", Config.probe_name, bounded_text(encoded_or_error)))
        return
    end

    file:write(encoded_or_error)
    file:write("\n")
    file:close()
    os.remove(Config.output_path)
    local renamed, rename_error = os.rename(temporary_path, Config.output_path)
    if not renamed then
        print(string.format("[%s] Could not finalize diagnostic output: %s\n", Config.probe_name, bounded_text(rename_error)))
    end
end

local function valid_object(object)
    if object == nil then
        return false
    end
    local ok, valid = pcall(function()
        return object:IsValid()
    end)
    return ok and valid
end

local function object_path(object)
    if not valid_object(object) then
        return nil
    end
    local ok, name = pcall(function()
        return object:GetFullName()
    end)
    if not ok then
        return nil
    end
    return bounded_text(name)
end

local function unwrap_context(context)
    if context == nil then
        return nil
    end
    local ok, object = pcall(function()
        return context:get()
    end)
    if not ok then
        return nil
    end
    return object
end

local function snapshot_array(object, field_name)
    local snapshot = {
        readable = false,
        count = nil,
        recordedElementPaths = json_array({}),
        unreadableElementCount = 0,
        truncated = false,
    }

    if not valid_object(object) then
        snapshot.error = "object-not-valid"
        return json_object(snapshot)
    end

    local ok, failure = pcall(function()
        local array = object:GetPropertyValue(field_name)
        snapshot.count = #array
        snapshot.readable = true
        for index = 1, snapshot.count do
            if #snapshot.recordedElementPaths.value >= MAX_ARRAY_ELEMENTS then
                snapshot.truncated = true
                break
            end

            local element = array[index]
            local unwrapped_ok, unwrapped = pcall(function()
                return element:get()
            end)
            if not unwrapped_ok then
                unwrapped = element
            end

            local path = object_path(unwrapped)
            if path == nil then
                snapshot.unreadableElementCount = snapshot.unreadableElementCount + 1
            end
            table.insert(snapshot.recordedElementPaths.value, path or "invalid-object-reference")
        end
    end)

    if not ok then
        snapshot.error = bounded_text(failure)
        add_error("queue:" .. field_name, failure)
    end
    return json_object(snapshot)
end

local function refresh_rental_manager(candidate)
    if valid_object(candidate) then
        rental_manager = candidate
    elseif not valid_object(rental_manager) then
        local ok, found = pcall(FindFirstOf, "RentSystem_C")
        if ok and valid_object(found) then
            rental_manager = found
        end
    end

    local rental = report.rentalManager.value
    rental.found = valid_object(rental_manager)
    rental.objectPath = object_path(rental_manager)
    if rental.found then
        rental.queues = json_object({
            rented = snapshot_array(rental_manager, "Cartridge Base out for Rent"),
            readyToReturn = snapshot_array(rental_manager, "Cartridge Base out Ready to Return"),
        })
    end
end

local function scan_customer_properties(customer)
    local customers = report.customers.value
    if customers.propertiesScanned or not valid_object(customer) then
        return
    end

    for _, field_name in ipairs(CUSTOMER_PROPERTY_CANDIDATES) do
        customers.propertiesVisited = customers.propertiesVisited + 1
        local readable = pcall(function()
            customer:GetPropertyValue(field_name)
        end)
        if readable then
            table.insert(customers.relevantClassProperties.value, field_name)
        else
            customers.propertiesUnreadable = customers.propertiesUnreadable + 1
            table.insert(customers.unreadablePropertyNames.value, field_name)
        end
    end
    customers.propertiesScanned = true
end

local function record_customer(customer)
    if not valid_object(customer) then
        return
    end

    local path = object_path(customer)
    if path == nil or customer_paths[path] then
        return
    end
    customer_paths[path] = true

    local customers = report.customers.value
    customers.instancesFound = customers.instancesFound + 1
    if #customers.recordedObjectPaths.value < MAX_CUSTOMERS then
        table.insert(customers.recordedObjectPaths.value, path)
    end
    scan_customer_properties(customer)
end

local function record_hook_callback(key, phase, context)
    local state = hook_states[key]
    if state == nil or not state.registered then
        return
    end

    local hook = state.report.value
    hook.callbackCount = hook.callbackCount + 1
    hook.lastPhase = phase
    hook.lastContextPath = object_path(unwrap_context(context))
    refresh_rental_manager(nil)

    if hook.callbackCount >= MAX_HOOK_CALLBACKS then
        pcall(UnregisterHook, state.path, state.pre_id, state.post_id)
        state.registered = false
        hook.registration = "capped-and-unregistered"
    end
    write_report()
end

local function define_hook(key, path, callback_model)
    local hook_report = json_object({
        key = key,
        functionPath = path,
        callbackModel = callback_model,
        registration = "pending",
        callbackCount = 0,
        lastPhase = nil,
        lastContextPath = nil,
    })
    table.insert(report.hooks.value, hook_report)
    hook_states[key] = {
        path = path,
        callback_model = callback_model,
        report = hook_report,
        registered = false,
    }
end

local function register_hook(key)
    local state = hook_states[key]
    if state == nil or state.registered then
        return
    end

    local ok, pre_or_error, post_id = pcall(function()
        return RegisterHook(state.path, function(context)
            record_hook_callback(key, "post", context)
        end)
    end)

    local hook = state.report.value
    if not ok or pre_or_error == nil then
        local first_unavailable_result = hook.registration ~= "unavailable"
        hook.registration = "unavailable"
        if not ok and first_unavailable_result then
            add_error("hook:" .. key, pre_or_error)
        end
        return
    end

    state.pre_id = pre_or_error
    state.post_id = post_id
    state.registered = true
    hook.registration = "registered"
end

local function register_blueprint_hooks()
    register_hook("movie-readiness")
    register_hook("movie-selector")
    register_hook("customer-return")
end

local function refresh_customers()
    local found_customers_ok, found_customers = pcall(FindAllOf, "AI_Client_Character_C")
    if found_customers_ok and found_customers ~= nil then
        for _, customer in ipairs(found_customers) do
            record_customer(customer)
        end
    elseif not found_customers_ok then
        add_error("find-customers", found_customers)
    end
end

local function runtime_scan_complete()
    if not report.rentalManager.value.found or not report.customers.value.propertiesScanned then
        return false
    end
    for _, state in pairs(hook_states) do
        if not state.registered then
            return false
        end
    end
    return true
end

define_hook(
    "movie-readiness",
    RENT_CLASS .. ":Get Movie ready for return",
    "blueprint-post-only")
define_hook(
    "movie-selector",
    RENT_CLASS .. ":Get Random List Of Cartridges From Rent List",
    "blueprint-post-only")
define_hook(
    "customer-return",
    CUSTOMER_CLASS .. ":Initial creation - Get if I have Product to return",
    "blueprint-post-only")
refresh_rental_manager(nil)
refresh_customers()
register_blueprint_hooks()

local rent_notification_ok, rent_notification_error = pcall(NotifyOnNewObject, RENT_CLASS, function(object)
    refresh_rental_manager(object)
    register_blueprint_hooks()
    write_report()
end)
if not rent_notification_ok then
    add_error("notify-rental-manager", rent_notification_error)
end

local customer_notification_ok, customer_notification_error = pcall(NotifyOnNewObject, CUSTOMER_CLASS, function(object)
    record_customer(object)
    register_blueprint_hooks()
    write_report()
end)
if not customer_notification_ok then
    add_error("notify-customer", customer_notification_error)
end

local runtime_scan_handle = nil

local function stop_runtime_scan(reason)
    local runtime_scan = report.runtimeScan.value
    runtime_scan.active = false
    runtime_scan.stopReason = reason
    if runtime_scan_handle ~= nil then
        local cancelled_ok, cancelled_or_error = pcall(CancelDelayedAction, runtime_scan_handle)
        if not cancelled_ok then
            add_error("runtime-scan-cancel", cancelled_or_error)
        end
    end
end

local function run_runtime_scan()
    local runtime_scan = report.runtimeScan.value
    runtime_scan.attempts = runtime_scan.attempts + 1
    refresh_rental_manager(nil)
    refresh_customers()
    register_blueprint_hooks()

    if runtime_scan_complete() then
        stop_runtime_scan("runtime-targets-found")
    elseif runtime_scan.attempts >= runtime_scan.maximumAttempts then
        stop_runtime_scan("maximum-attempts-reached")
    end
    write_report()
end

local runtime_scan_ok, runtime_scan_handle_or_error = pcall(
    LoopInGameThreadWithDelay,
    RUNTIME_SCAN_INTERVAL_MS,
    run_runtime_scan)
if runtime_scan_ok and runtime_scan_handle_or_error ~= nil then
    runtime_scan_handle = runtime_scan_handle_or_error
    report.runtimeScan.value.active = true
else
    add_error("runtime-scan-start", runtime_scan_handle_or_error)
end

write_report()
print(string.format("[%s] Compatibility probe loaded. Diagnostic output stays in the configured local path.\n", Config.probe_name))
