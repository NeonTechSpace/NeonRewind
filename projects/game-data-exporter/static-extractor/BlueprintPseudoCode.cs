namespace NeonRewind.StaticExtractor;

internal static class BlueprintPseudoCode
{
    public static string ExtractFunction(string classPseudoCode, string functionName)
    {
        var normalized = classPseudoCode
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace('\r', '\n');
        var lines = normalized.Split('\n');
        var signatureNeedle = functionName + "(";
        var signatureLines = lines
            .Select((line, index) => new { Line = line, Index = index })
            .Where(value =>
                value.Line.Contains(signatureNeedle, StringComparison.Ordinal) &&
                LooksLikeFunctionSignature(lines, value.Index))
            .Select(value => value.Index)
            .ToArray();
        if (signatureLines.Length != 1)
        {
            throw new InvalidDataException(
                $"Expected one pseudocode signature for Blueprint function, found {signatureLines.Length}: {functionName}");
        }

        var startLine = signatureLines[0];
        var depth = 0;
        var foundOpeningBrace = false;
        for (var lineIndex = startLine; lineIndex < lines.Length; lineIndex++)
        {
            CountBraces(lines[lineIndex], ref depth, ref foundOpeningBrace);
            if (foundOpeningBrace && depth == 0)
            {
                return string.Join('\n', lines[startLine..(lineIndex + 1)]).TrimEnd();
            }
        }

        throw new InvalidDataException($"Pseudocode body is incomplete for Blueprint function: {functionName}");
    }

    private static bool LooksLikeFunctionSignature(string[] lines, int lineIndex)
    {
        var line = lines[lineIndex].TrimEnd();
        if (line.EndsWith(';'))
        {
            return false;
        }

        if (line.Contains('{'))
        {
            return true;
        }

        for (var nextLine = lineIndex + 1; nextLine < lines.Length; nextLine++)
        {
            var trimmed = lines[nextLine].Trim();
            if (trimmed.Length == 0)
            {
                continue;
            }

            return trimmed == "{";
        }

        return false;
    }

    private static void CountBraces(string line, ref int depth, ref bool foundOpeningBrace)
    {
        var inString = false;
        var escaped = false;
        foreach (var character in line)
        {
            if (inString)
            {
                if (escaped)
                {
                    escaped = false;
                }
                else if (character == '\\')
                {
                    escaped = true;
                }
                else if (character == '"')
                {
                    inString = false;
                }

                continue;
            }

            if (character == '"')
            {
                inString = true;
            }
            else if (character == '{')
            {
                foundOpeningBrace = true;
                depth++;
            }
            else if (character == '}' && foundOpeningBrace)
            {
                depth--;
                if (depth < 0)
                {
                    throw new InvalidDataException("Blueprint pseudocode has unbalanced braces.");
                }
            }
        }
    }
}
