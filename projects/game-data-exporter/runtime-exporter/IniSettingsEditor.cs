using System.Text;
using System.Text.RegularExpressions;

namespace NeonRetroRewind.RuntimeExporter;

internal static partial class IniSettingsEditor
{
    private static readonly UTF8Encoding Utf8WithoutBom = new(false);

    public static void ConfigureForProbe(string settingsPath, string modsDirectory, string modsListPath) =>
        ConfigureForSingleMod(settingsPath, modsDirectory, modsListPath);

    public static void ConfigureForSingleMod(string settingsPath, string modsDirectory, string modsListPath)
    {
        var lines = File.ReadAllText(settingsPath, Encoding.UTF8)
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Split('\n')
            .ToList();

        SetRequiredValue(lines, "ModsFolderPath", string.Empty);
        SetRequiredValue(lines, "ControllingModsTxt", ToIniPath(modsListPath));
        SetRequiredValue(lines, "EnableHotReloadSystem", "0");
        SetRequiredValue(lines, "EnableAutoReloadingLuaMods", "0");
        SetRequiredValue(lines, "ConsoleEnabled", "0");
        SetRequiredValue(lines, "GuiConsoleEnabled", "0");
        SetRequiredValue(lines, "GuiConsoleVisible", "0");

        lines.RemoveAll(line => ActiveAdditionalModsPath().IsMatch(line));

        var baseModsIndex = lines.FindIndex(line => ActiveKey("ModsFolderPath").IsMatch(line));
        if (baseModsIndex < 0)
        {
            throw new InvalidDataException("UE4SS settings do not contain ModsFolderPath.");
        }

        lines.Insert(baseModsIndex + 1, $"+ModsFolderPaths = {ToIniPath(modsDirectory)}");
        File.WriteAllText(settingsPath, string.Join('\n', lines), Utf8WithoutBom);
    }

    private static void SetRequiredValue(List<string> lines, string key, string value)
    {
        var matches = lines
            .Select((line, index) => (line, index))
            .Where(item => ActiveKey(key).IsMatch(item.line))
            .Select(item => item.index)
            .ToArray();

        if (matches.Length != 1)
        {
            throw new InvalidDataException($"UE4SS settings must contain exactly one active {key} entry.");
        }

        lines[matches[0]] = $"{key} = {value}";
    }

    private static Regex ActiveKey(string key) =>
        new($"^\\s*{Regex.Escape(key)}\\s*=", RegexOptions.CultureInvariant);

    private static string ToIniPath(string path) =>
        Path.GetFullPath(path).Replace('\\', '/');

    [GeneratedRegex("^\\s*[+-]ModsFolderPaths\\s*=", RegexOptions.CultureInvariant)]
    private static partial Regex ActiveAdditionalModsPath();
}
