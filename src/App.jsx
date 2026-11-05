import { useState } from "react";
import { apiRequest } from "./services/api";
import { validateField } from "./lib/validation";
import { isFieldVisible } from "./lib/conditionEvaluator";
import { Routes, Route } from "react-router-dom";
import FormRenderer from "./FormRenderer";


const fieldTypes = [
  "Text",
  "Textarea",
  "Number",
  "Email",
  "Select",
  "Radio Group",
  "Checkbox",
  "Date",
];

function App() {
  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [isPreview, setIsPreview] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [importError, setImportError] = useState("");
  const [draggedFieldId, setDraggedFieldId] = useState(null);
  const [formTitle, setFormTitle] = useState("Untitled Form");
  const [formId, setFormId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [savedForms, setSavedForms] = useState([]);



  function addField(type) {
    const newField = {
      id: crypto.randomUUID(),
      type,
      label: type,
      name: `${type.toLowerCase().replaceAll(" ", "_")}_${fields.length + 1}`,
      placeholder: "",
      required: false,
      options: ["Option 1", "Option 2"],
      minLength: "",
      maxLength: "",
      minValue: "",
      maxValue: "",
      pattern: "",
      errorMessage: "",
      conditions: [],
    };
    setFields((currentFields) => [...currentFields, newField]);
    setSelectedFieldId(newField.id);
  }


  const selectedField = fields.find(
    (field) => field.id === selectedFieldId
  );

  function updateSelectedField(property, value) {
    setFields((currentFields) =>
      currentFields.map((field) =>
        field.id === selectedFieldId
          ? { ...field, [property]: value }
          : field
      )
    );
  }

  function deleteSelectedField() {
    setFields((currentFields) =>
      currentFields.filter((field) => field.id !== selectedFieldId)
    );
    setSelectedFieldId(null);
  }


  function renderField(field) {
    const commonProps = {
      name: field.name,
      placeholder: field.placeholder || field.label,
      value: formValues[field.name] ?? "",
      required: field.required,
      onChange: (e) => {
        const value = e.target.value;

        updateFormValue(field.name, value);

        if (touchedFields[field.name]) {
          const fieldErrors = validateField(field, value);

          setErrors((currentErrors) => {
            const updatedErrors = { ...currentErrors };

            if (fieldErrors.length > 0) {
              updatedErrors[field.name] = fieldErrors;
            } else {
              delete updatedErrors[field.name];
            }

            return updatedErrors;
          });
        }
      },
      onBlur: () => {
        setTouchedFields((current) => ({
          ...current,
          [field.name]: true,
        }));

        validateOneField(field);
      },
      className: "mt-2 w-full rounded-lg border border-slate-300 p-2",
    };

    switch (field.type) {
      case "Text":
        return <input type="text" {...commonProps} />;

      case "Email":
        return <input type="email" {...commonProps} />;

      case "Number":
        return <input type="number" {...commonProps} />;

      case "Textarea":
        return <textarea {...commonProps} rows={3} />;

      case "Date":
        return <input type="date" {...commonProps} className={commonProps.className} />;

      case "Checkbox":
        return (
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              name={field.name}
              checked={Boolean(formValues[field.name])}
              required={field.required}
              onChange={(e) =>
                updateFormValue(field.name, e.target.checked)
              }
            />
            {field.label}
          </label>
        );


      case "Select":
        return (
          <select
            name={field.name}
            value={formValues[field.name] ?? ""}
            onChange={(e) =>
              updateFormValue(field.name, e.target.value)
            }
            onBlur={() => {
              setTouchedFields((current) => ({
                ...current,
                [field.name]: true,
              }));
              validateOneField(field);
            }}
            required={field.required}
            className={commonProps.className}
          >
            <option value="">Select an option</option>

            {(field.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "Radio Group":
        return (
          <div className="mt-2 space-y-2">
            {(field.options || []).map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input type="radio" name={field.name} value={option}
                  checked={formValues[field.name] === option}
                  onChange={(e) => updateFormValue(field.name, e.target.value)}
                />
                {option}
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  }



  function updateFormValue(name, value) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  }



  async function handleSaveForm() {
    if (!formTitle.trim()) {
      setSaveMessage("Please enter a form title.");
      return;
    }

    try {
      setIsSaving(true);
      setSaveMessage("");

      const data = await apiRequest(
        formId ? `/forms/${formId}` : "/forms",
        {
          method: formId ? "PUT" : "POST",
          body: JSON.stringify({
            title: formTitle,
            fields,
          }),
        }
      );

      const savedForm = data.form || data;
      setFormId(savedForm._id || savedForm.id);

      setSaveMessage("Form saved successfully!");
    } catch (error) {
      setSaveMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function fetchSavedForms() {
    try {
      const data = await apiRequest("/forms");
      setSavedForms(data.forms || data);
    } catch (error) {
      setSaveMessage(error.message);
    }
  }

  async function handleLoadForm(id) {
    try {
      const data = await apiRequest(`/forms/${id}`);
      const form = data.form || data;
      console.log("Loaded fields:", form.fields);
      console.log("Field IDs:", form.fields.map((field) => field.id));
      setFormId(form._id);
      setFormTitle(form.title);
      setFields(form.fields);
      setSelectedFieldId(null);
      setFormValues({});
      setErrors({});
      setSubmittedData(null);
      setIsPreview(false);
      setSaveMessage("Form loaded successfully!");
    } catch (error) {
      setSaveMessage(error.message);
    }
  }



  function handleSubmit(e) {
    e.preventDefault();

    const newErrors = {};

    // Only validate visible fields
    const visibleFields = fields.filter((field) =>
      isFieldVisible(field, fields, formValues)
    );

    visibleFields.forEach((field) => {
      const value = formValues[field.name] ?? "";
      const fieldErrors = validateField(field, value);

      if (fieldErrors.length > 0) {
        newErrors[field.name] = fieldErrors;
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setSubmittedData(null);
      return;
    }

    // Submit only visible field values
    const submittedValues = Object.fromEntries(
      visibleFields.map((field) => [
        field.name,
        formValues[field.name] ?? "",
      ])
    );

    setSubmittedData(submittedValues);
  }


  function validateOneField(field) {
    const value = formValues[field.name] ?? "";
    const fieldErrors = validateField(field, value);

    setErrors((currentErrors) => {
      const updatedErrors = { ...currentErrors };

      if (fieldErrors.length > 0) {
        updatedErrors[field.name] = fieldErrors;
      } else {
        delete updatedErrors[field.name];
      }

      return updatedErrors;
    });
  }


  function exportJSON() {
    const schema = { fields };

    const json = JSON.stringify(schema, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "formcraft-schema.json";
    link.click();

    URL.revokeObjectURL(url);
  }


  function importJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError("");

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const schema = JSON.parse(reader.result);

        if (
          !schema ||
          typeof schema !== "object" ||
          !Array.isArray(schema.fields)
        ) {
          throw new Error("Invalid schema format.");
        }

        const validTypes = [
          "Text", "Textarea", "Number", "Email",
          "Select", "Radio Group", "Checkbox", "Date",
        ];

        const validFields = schema.fields.every(
          (field) =>
            field &&
            typeof field.id === "string" &&
            typeof field.name === "string" &&
            typeof field.label === "string" &&
            validTypes.includes(field.type)
        );

        if (!validFields) {
          throw new Error("Schema contains invalid fields.");
        }

        setFields(schema.fields);
        setSelectedFieldId(null);
        setFormValues({});
        setErrors({});
        setSubmittedData(null);
      } catch {
        setImportError("Invalid JSON file or unsupported schema.");
      }
    };

    reader.readAsText(file);
    e.target.value = "";
  }


  function handleDrop(targetFieldId) {
    if (!draggedFieldId || draggedFieldId === targetFieldId) {
      setDraggedFieldId(null);
      return;
    }

    setFields((currentFields) => {
      const updatedFields = [...currentFields];

      const draggedIndex = updatedFields.findIndex(
        (field) => field.id === draggedFieldId
      );

      const targetIndex = updatedFields.findIndex(
        (field) => field.id === targetFieldId
      );

      if (draggedIndex === -1 || targetIndex === -1) {
        return currentFields;
      }

      const [draggedField] = updatedFields.splice(draggedIndex, 1);
      updatedFields.splice(targetIndex, 0, draggedField);

      return updatedFields;
    });

    setDraggedFieldId(null);
  }


  return (
    <Routes>
      <Route path="/" element={



        <div className="min-h-screen bg-slate-100 text-slate-900">
          <header className="flex items-center justify-between border-b bg-white px-6 py-4">
            <h1 className="text-xl lg:text-2xl font-bold text-indigo-600">FormCraft</h1>

            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="mt-2 rounded-lg border p-2"
              placeholder="Enter form title"
            />


            <div className="flex gap-3">
              <button
                onClick={handleSaveForm}
                disabled={isSaving}
                className="rounded-lg bg-green-600 px-3 py-2 text-white"
              >
                {isSaving ? "Saving..." : "Save Form"}
              </button>


              <button
                onClick={() => {
                  setIsPreview((current) => !current);
                  setSubmittedData(null);
                }}
                className="rounded-lg border px-2 py-1 lg:px-4 lg:py-2 text-[12px] lg:text-[16px] "
              >
                {isPreview ? "Back to Builder" : "Preview"}

              </button>
              <button
                onClick={exportJSON}
                className="rounded-lg bg-indigo-600 px-2 py-1 lg:px-4 lg:py-2 text-white text-[12px] lg:text-[16px]"
              >
                Export JSON
              </button>

              <label className="cursor-pointer rounded-lg border px-2 py-1 lg:px-4 lg:py-2 text-[12px] lg:text-[16px]">
                Import JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={importJSON}
                  className="hidden"
                />
              </label>
            </div>

            {saveMessage && (
              <p className="text-sm text-green-600">{saveMessage}</p>
            )}

            {importError && (
              <p role="alert" className="text-sm text-red-600">
                {importError}
              </p>
            )}
          </header>

          <main className="grid min-h-[calc(100vh-73px)] grid-cols-1 sm:p-4 lg:grid-cols-12 gap-4 p-4">
            <aside className="rounded-xl border bg-white p-3 sm:p-4 lg:col-span-3">
              <h2 className="mb-4 text-lg font-semibold">Field Palette</h2>

              <div className="space-y-3">
                {fieldTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => addField(type)}
                    className="w-full rounded-lg border p-3 text-left hover:border-indigo-500 hover:bg-indigo-50"
                  >
                    + {type}
                  </button>
                ))}
              </div>
            </aside>

            <section className="min-w-0 rounded-xl border bg-white p-3 sm:p-4 lg:col-span-6">
              <h2 className="mb-4 text-lg font-semibold">
                {isPreview ? "Form Preview" : "Form Canvas"}
              </h2>

              {isPreview ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {fields.filter((field) => isFieldVisible(field, fields, formValues))
                    .map((field) => (
                      <div key={field.id}>
                        <label className="block font-medium">
                          {field.label}
                          {field.required && (
                            <span className="text-red-500"> *</span>
                          )}
                        </label>

                        {renderField(field)}
                        {errors[field.name]?.map((error, index) => (
                          <p
                            key={index}
                            className="mt-1 text-sm text-red-600"
                            role="alert"
                          >
                            {error}
                          </p>
                        ))}
                      </div>
                    ))}

                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-white"
                  >
                    Submit
                  </button>

                  {submittedData && (
                    <pre className="overflow-auto rounded-lg bg-slate-100 p-3 text-sm">
                      {JSON.stringify(submittedData, null, 2)}
                    </pre>
                  )}
                </form>
              ) : (
                <div className="min-h-[500px] space-y-4 rounded-lg border-2 border-dashed border-slate-300 p-4">
                  {fields.length === 0 ? (
                    <p className="py-20 text-center text-slate-500">
                      Add fields here to build your form.
                    </p>
                  ) : (
                    fields.map((field) => (
                      <div
                        key={field.id}
                        draggable
                        onDragStart={() => setDraggedFieldId(field.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(field.id)}
                        onDragEnd={() => setDraggedFieldId(null)}
                        onClick={() => setSelectedFieldId(field.id)}
                        className={`cursor-move rounded-lg border bg-white p-4 ${selectedFieldId === field.id
                          ? "border-indigo-600 ring-2 ring-indigo-100"
                          : "border-slate-200"
                          } ${draggedFieldId === field.id ? "opacity-50" : ""
                          }`}
                      >
                        <p className="font-medium">{field.label}</p>
                        {renderField(field)}
                        <p className="mt-1 text-sm text-slate-500">
                          Type: {field.type} · Name: {field.name}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>


            <aside className="min-w-0 rounded-xl border bg-white p-3 sm:p-4 lg:col-span-3">


              <div className="mb-5 border-b pb-4">
                <h2 className="mb-3 text-lg font-semibold">Saved Forms</h2>

                <button
                  onClick={fetchSavedForms}
                  className="mb-3 rounded-lg bg-indigo-600 px-3 py-2 text-white"
                >
                  Refresh Forms
                </button>

                <div className="space-y-2">
                  {savedForms.map((form) => (
                    <div
                      key={form._id}
                      className="flex items-center justify-between gap-2 rounded-lg border p-2"
                    >
                      <span className="text-sm">{form.title}</span>

                      <button
                        onClick={() => handleLoadForm(form._id)}
                        className="rounded bg-slate-100 px-3 py-1 text-sm"
                      >
                        Load
                      </button>
                    </div>
                  ))}
                </div>
              </div>


              <h2 className="mb-4 text-lg font-semibold">Properties</h2>

              {!selectedField ? (
                <p className="text-sm text-slate-500">
                  Select a field to configure its properties.
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Label
                    </label>
                    <input
                      value={selectedField.label}
                      onChange={(e) =>
                        updateSelectedField("label", e.target.value)
                      }
                      className="w-full rounded-lg border p-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Name
                    </label>
                    <input
                      value={selectedField.name}
                      onChange={(e) =>
                        updateSelectedField("name", e.target.value)
                      }
                      className="w-full rounded-lg border p-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Placeholder
                    </label>
                    <input
                      value={selectedField.placeholder}
                      onChange={(e) =>
                        updateSelectedField("placeholder", e.target.value)
                      }
                      className="w-full rounded-lg border p-2"
                    />
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedField.required}
                      onChange={(e) =>
                        updateSelectedField("required", e.target.checked)
                      }
                    />
                    Required field
                  </label>

                  <div className="space-y-3 rounded-lg border p-3">
                    <h3 className="font-medium">Conditional Logic</h3>

                    <label className="block text-sm">
                      Show this field when
                    </label>

                    <select
                      className="w-full rounded-lg border p-2"
                      value={selectedField.conditions?.[0]?.fieldId || ""}
                      onChange={(e) =>
                        updateSelectedField(
                          "conditions",
                          e.target.value
                            ? [{
                              fieldId: e.target.value,
                              operator: "equals",
                              value: "",
                            }]
                            : []
                        )
                      }
                    >
                      <option value="">Always show</option>
                      {fields
                        .filter((field) => field.id !== selectedField.id)
                        .map((field) => (
                          <option key={field.id} value={field.id}>
                            {field.label}
                          </option>
                        ))}
                    </select>

                    {selectedField.conditions?.length > 0 && (
                      <>
                        <select
                          className="w-full rounded-lg border p-2"
                          value={selectedField.conditions[0].operator}
                          onChange={(e) =>
                            updateSelectedField("conditions", [{
                              ...selectedField.conditions[0],
                              operator: e.target.value,
                            }])
                          }
                        >
                          <option value="equals">Equals</option>
                          <option value="notEquals">Does not equal</option>
                          <option value="contains">Contains</option>
                          <option value="greaterThan">Greater than</option>
                          <option value="lessThan">Less than</option>
                          <option value="isEmpty">Is empty</option>
                        </select>

                        <input
                          className="w-full rounded-lg border p-2"
                          placeholder="Comparison value"
                          value={selectedField.conditions[0].value}
                          onChange={(e) =>
                            updateSelectedField("conditions", [{
                              ...selectedField.conditions[0],
                              value: e.target.value,
                            }])
                          }
                        />
                      </>
                    )}
                  </div>

                  {["Text", "Textarea", "Email"].includes(selectedField.type) && (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Minimum Length
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={selectedField.minLength ?? ""}
                          onChange={(e) =>
                            updateSelectedField("minLength", e.target.value)
                          }
                          className="w-full rounded-lg border p-2"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Maximum Length
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={selectedField.maxLength ?? ""}
                          onChange={(e) =>
                            updateSelectedField("maxLength", e.target.value)
                          }
                          className="w-full rounded-lg border p-2"
                        />
                      </div>
                    </>
                  )}

                  {selectedField.type === "Number" && (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Minimum Value
                        </label>
                        <input
                          type="number"
                          value={selectedField.minValue ?? ""}
                          onChange={(e) =>
                            updateSelectedField("minValue", e.target.value)
                          }
                          className="w-full rounded-lg border p-2"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Maximum Value
                        </label>
                        <input
                          type="number"
                          value={selectedField.maxValue ?? ""}
                          onChange={(e) =>
                            updateSelectedField("maxValue", e.target.value)
                          }
                          className="w-full rounded-lg border p-2"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Custom Error Message
                    </label>
                    <input
                      value={selectedField.errorMessage ?? ""}
                      onChange={(e) =>
                        updateSelectedField("errorMessage", e.target.value)
                      }
                      placeholder="Please enter a valid value"
                      className="w-full rounded-lg border p-2"
                    />
                  </div>






                  {(selectedField.type === "Select" ||
                    selectedField.type === "Radio Group") && (
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Options
                        </label>

                        <textarea
                          value={(selectedField.options || []).join("\n")}
                          onChange={(e) =>
                            updateSelectedField(
                              "options",
                              e.target.value.split("\n")
                            )
                          }
                          rows={4}
                          className="w-full rounded-lg border p-2"
                          placeholder={"India\nUSA\nCanada"}
                        />
                      </div>
                    )}


                  <button
                    onClick={deleteSelectedField}
                    className="w-full rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                  >
                    Delete Field
                  </button>
                </div>
              )}
            </aside>
          </main>
        </div>
      } />
      <Route path="/forms/:id" element={<FormRenderer />} />
    </Routes>
  );
}

export default App;
