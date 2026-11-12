
export function evaluateCondition(condition, fields, values) {
  const sourceField = fields.find(
    (field) => field.id === condition.fieldId
  );

  if (!sourceField) return false;

  const actual = values[sourceField.name] ?? "";
  const expected = condition.value ?? "";

  switch (condition.operator) {
    case "equals":
      return String(actual) === String(expected);

    case "notEquals":
      return String(actual) !== String(expected);

    case "contains":
      return Array.isArray(actual)
        ? actual.includes(expected)
        : String(actual).includes(String(expected));

    case "greaterThan":
      return actual !== "" && Number(actual) > Number(expected);

    case "lessThan":
      return actual !== "" && Number(actual) < Number(expected);

    case "isEmpty":
      return actual == null || String(actual).trim() === "";

    default:
      return false;
  }
}

export function isFieldVisible(
  field,
  fields,
  values,
  visited = new Set()
) {
  if (visited.has(field.id)) return false;

  if (!field.conditions?.length) return true;

  const currentPath = new Set(visited);
  currentPath.add(field.id);

  const checkCondition = (condition) => {
    const sourceField = fields.find(
      (item) => item.id === condition.fieldId
    );

    if (!sourceField) return false;

    // Hidden parent means its value must be treated as empty
    const sourceVisible = isFieldVisible(
      sourceField,
      fields,
      values,
      currentPath
    );

    if (!sourceVisible) {
      return condition.operator === "isEmpty";
    }

    return evaluateCondition(condition, fields, values);
  };

  return field.conditionLogic === "OR"
    ? field.conditions.some(checkCondition)
    : field.conditions.every(checkCondition);
}
