
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
      return Number(actual) > Number(expected);

    case "lessThan":
      return Number(actual) < Number(expected);

    case "isEmpty":
      return actual == null || String(actual).trim() === "";

    default:
      return false;
  }
}

export function isFieldVisible(field, fields, values) {
  if (!field.conditions?.length) return true;

  return field.conditions.every((condition) =>
    evaluateCondition(condition, fields, values)
  );
}
