async function restoreTimesNewRoman() {
  const expectedVariableId = "VariableID:51:270";
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const collection = collections.find((item) => item.name === "Typeface");
  if (!collection) throw new Error("Typeface collection not found");

  const mode = collection.modes.find((item) => item.name === "Serif");
  if (!mode) throw new Error("Typeface / Serif mode not found");

  const variable = await figma.variables.getVariableByIdAsync(expectedVariableId);
  if (!variable) throw new Error("Typeface / font/family variable not found");
  if (
    variable.id !== expectedVariableId ||
    variable.resolvedType !== "STRING" ||
    variable.variableCollectionId !== collection.id ||
    variable.name !== "font/family"
  ) {
    throw new Error("Typeface variable identity check failed");
  }

  const current = variable.valuesByMode[mode.modeId];
  if (current !== "Tinos") {
    throw new Error(`Expected temporary Tinos value; found ${String(current)}`);
  }

  const requiredStyles = ["Regular", "Bold", "Italic", "Bold Italic"];
  const available = await figma.listAvailableFontsAsync();
  const availableStyles = new Set(
    available
      .filter((font) => font.fontName.family === "Times New Roman")
      .map((font) => font.fontName.style),
  );
  const missing = requiredStyles.filter((style) => !availableStyles.has(style));
  if (missing.length) {
    throw new Error(`Times New Roman styles unavailable: ${missing.join(", ")}`);
  }

  await Promise.all(
    requiredStyles.map((style) =>
      figma.loadFontAsync({ family: "Times New Roman", style }),
    ),
  );
  variable.setValueForMode(mode.modeId, "Times New Roman");
}

restoreTimesNewRoman()
  .then(() => figma.closePlugin("Restored Typeface / Serif to Times New Roman."))
  .catch((error) => figma.closePlugin(`No change: ${error.message}`));
