import { useEffect, useState } from "react";
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [formStatus, setFormStatus] = useState("draft");


  const [draggedFieldType, setDraggedFieldType] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [saveMessageType, setSaveMessageType] = useState("");

  useEffect(() => {
    if (!saveMessage) return;

    const timer = setTimeout(() => {
      setSaveMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [saveMessage]);



  function addField(type) {
    const baseName = type.toLowerCase().replaceAll(" ", "_");

    let suffix = 1;
    let fieldName = `${baseName}_${suffix}`;

    while (fields.some((field) => field.name === fieldName)) {
      suffix++;
      fieldName = `${baseName}_${suffix}`;
    }

    const newField = {
      id: crypto.randomUUID(),
      type,
      label: type,
      name: fieldName,
      placeholder: "",
      defaultValue: "",
      helpText: "",
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
    if (property === "conditions") {
      setImportError("");
      const selectedField = fields.find(
        (field) => field.id === selectedFieldId
      );

      if (!selectedField) return;

      const createsCycle = (fieldId, visited = new Set()) => {
        if (fieldId === selectedFieldId) return true;
        if (visited.has(fieldId)) return false;

        visited.add(fieldId);

        const field = fields.find((item) => item.id === fieldId);
        if (!field) return false;

        return (field.conditions || []).some((condition) =>
          createsCycle(condition.fieldId, new Set(visited))
        );
      };

      const hasCycle = value.some(
        (condition) =>
          condition.fieldId && createsCycle(condition.fieldId)
      );

      if (hasCycle) {
        setImportError("Circular condition detected. Please choose another field.");
        return;
      }
    }

    setFields((currentFields) =>
      currentFields.map((field) =>
        field.id === selectedFieldId
          ? { ...field, [property]: value }
          : field
      )
    );
  }


  function deleteSelectedField() {
    const dependentFields = fields.filter((field) =>
      field.conditions?.some(
        (condition) => condition.fieldId === selectedFieldId
      )
    );

    if (dependentFields.length > 0) {
      const names = dependentFields
        .map((field) => field.label)
        .join(", ");

      const confirmed = window.confirm(
        `These fields depend on this field: ${names}. Delete it and remove their conditions?`
      );

      if (!confirmed) return;
    }

    setFields((currentFields) =>
      currentFields
        .filter((field) => field.id !== selectedFieldId)
        .map((field) => ({
          ...field,
          conditions: (field.conditions || []).filter(
            (condition) => condition.fieldId !== selectedFieldId
          ),
        }))
    );

    setSelectedFieldId(null);
    setImportError("");
  }


  async function handleDeleteForm(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this form?"
    );

    if (!confirmDelete) return;

    try {
      await apiRequest(`/forms/${id}`, {
        method: "DELETE",
      });

      setSaveMessage("Form deleted successfully!");

      if (formId === id) {
        handleNewForm();
      }

      await fetchSavedForms();
    } catch (error) {
      setSaveMessage(error.message);
    }
  }

  function renderField(field) {
    const commonProps = {
      id: field.id,
      "aria-invalid": errors[field.name]?.length > 0,
      "aria-describedby": errors[field.name]?.length > 0
        ? `${field.id}-error`
        : field.helpText
          ? `${field.id}-help`
          : undefined,
      name: field.name,
      placeholder: field.placeholder || field.label,
      value: formValues[field.name] ?? field.defaultValue ?? "",
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


    const fieldLabel = (
      <label htmlFor={field.id} className="block font-medium">
        {field.label}
        {field.required && <span aria-hidden="true"> *</span>}
      </label>
    );

    switch (field.type) {
      case "Text":
        return (
          <>

            <input type="text" {...commonProps} />
          </>
        );

      case "Email":
        return (
          <>
            <input type="email" {...commonProps} />
          </>
        );
      case "Number":
        return (
          <>
            <input type="number" {...commonProps} />
          </>
        );
      case "Textarea":
        return (
          <>
            <textarea {...commonProps} rows={3} />
          </>
        );
      case "Date":
        return (
          <>
            <input type="date" {...commonProps} className={commonProps.className} />
          </>
        );
      case "Checkbox":
        return (
          <div className="mt-2">
            <label htmlFor={field.id} className="flex items-center gap-2">
              <input
                id={field.id}
                type="checkbox"
                name={field.name}
                checked={Boolean(formValues[field.name])}
                required={field.required}
                aria-invalid={errors[field.name]?.length > 0}
                aria-describedby={
                  errors[field.name]?.length > 0
                    ? `${field.id}-error`
                    : field.helpText
                      ? `${field.id}-help`
                      : undefined
                }
                onChange={(e) =>
                  updateFormValue(field.name, e.target.checked)
                }
              />
              {field.label}
            </label>
          </div>
        );

      case "Select":
        return (
          <select
            name={field.name}
            id={field.id}
            aria-invalid={errors[field.name]?.length > 0}
            aria-describedby={
              errors[field.name]?.length > 0
                ? `${field.id}-error`
                : field.helpText
                  ? `${field.id}-help`
                  : undefined
            }
            value={formValues[field.name] ?? ""}
            onChange={(e) => {
              const value = e.target.value;

              updateFormValue(field.name, value);

              if (touchedFields[field.name]) {
                const fieldErrors = validateField(field, value);

                setErrors((current) => ({
                  ...current,
                  [field.name]: fieldErrors,
                }));
              }
            }}
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
            {field.options.map((option, index) => {
              const optionId = `${field.id}-option-${index}`;

              return (
                <label key={optionId} htmlFor={optionId} className="flex items-center gap-2">
                  <input
                    id={optionId}
                    type="radio"
                    name={field.name}
                    value={option}
                    checked={formValues[field.name] === option}
                    onChange={(e) =>
                      updateFormValue(field.name, e.target.value)
                    }
                  />
                  {option}
                </label>
              );
            })}
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
      setSaveMessageType("error");
      return;
    }

    try {
      setIsSaving(true);
      setSaveMessage("");
      setSaveMessageType("");

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

      if (savedForm.status) {
        setFormStatus(savedForm.status);
      }


      setSaveMessage("Form saved successfully!");
      setSaveMessageType("success");
    } catch (error) {
      setSaveMessage(error.message);
      setSaveMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }


  async function handlePublishForm() {
    if (!formId) {
      setSaveMessage("Please save the form before publishing.");
      setSaveMessageType("error");
      return;
    }

    try {
      setIsPublishing(true);
      setSaveMessage("");
      setSaveMessageType("");

      const data = await apiRequest(`/forms/${formId}/publish`, {
        method: "PATCH",
      });

      setFormStatus(data.form?.status || "published");
      setSaveMessage("Form published successfully!");
      setSaveMessageType("success");

      await fetchSavedForms();
    } catch (error) {
      setSaveMessage(error.message);
      setSaveMessageType("error");
    } finally {
      setIsPublishing(false);
    }
  }


  function handleNewForm() {
    setFormId(null);
    setFormStatus("draft");
    setFormTitle("");
    setFields([]);
    setSelectedFieldId(null);
    setSaveMessage("");
    setSavedForms([]);
  }

  async function handleCopyLink(id) {
    const url = `${window.location.origin}/forms/${id}`;

    try {
      await navigator.clipboard.writeText(url);
      setSaveMessage("Form link copied successfully!");
    } catch (error) {
      setSaveMessage("Unable to copy form link.");
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

      setFormId(form._id);
      setFormTitle(form.title);
      setFormStatus(form.status || "draft");
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
      const value = formValues[field.name] ?? field.defaultValue ?? "";
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
        formValues[field.name] ?? field.defaultValue ?? "",
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
    const schema = {
      title: formTitle,
      fields,
    };

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
          Array.isArray(schema) ||
          !Array.isArray(schema.fields)
        ) {
          throw new Error("Invalid schema format.");
        }

        const validTypes = [
          "Text", "Textarea", "Number", "Email",
          "Select", "Radio Group", "Checkbox", "Date",
        ];

        const stringProperties = [
          "id", "name", "label", "placeholder",
          "defaultValue", "helpText", "pattern", "errorMessage",
        ];

        const numericProperties = [
          "minLength", "maxLength", "minValue", "maxValue",
        ];

        const validFields = schema.fields.every((field) => {
          if (
            !field ||
            typeof field !== "object" ||
            Array.isArray(field) ||
            !validTypes.includes(field.type)
          ) {
            return false;
          }

          if (
            !stringProperties.every(
              (key) => typeof field[key] === "string"
            )
          ) {
            return false;
          }

          if (typeof field.required !== "boolean") {
            return false;
          }

          if (
            !numericProperties.every(
              (key) =>
                field[key] === "" ||
                (typeof field[key] === "number" &&
                  Number.isFinite(field[key]))
            )
          ) {
            return false;
          }

          if (
            !Array.isArray(field.options) ||
            !field.options.every((option) => typeof option === "string")
          ) {
            return false;
          }

          if (
            !Array.isArray(field.conditions) ||
            !field.conditions.every(
              (condition) =>
                condition &&
                typeof condition === "object" &&
                !Array.isArray(condition)
            )
          ) {
            return false;
          }

          return true;
        });

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
       
          <header className="border-b bg-white px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-bold text-indigo-600 lg:text-2xl">
                FormCraft
              </h1>

              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-40 rounded-lg border p-2 sm:w-56"
                placeholder="Enter form title"
              />

              {/* Mobile Menu Icon */}
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="rounded-lg border p-2 text-xl md:hidden"
                aria-label="Toggle menu"
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? "✕" : "☰"}
              </button>

              {/* Desktop Buttons */}
              <div className="hidden items-center gap-3 md:flex">
                <button
                  onClick={handleSaveForm}
                  disabled={isSaving}
                  className="rounded-lg bg-green-600 px-3 py-2 text-white"
                >
                  {isSaving ? "Saving..." : "Save Form"}
                </button>


                <button
                  onClick={() => {
                    handlePublishForm();
                    setIsMenuOpen(false);
                  }}
                  disabled={!formId || isPublishing || formStatus === "published"}
                  className=" rounded-lg bg-blue-600 px-2 py-2 text-white disabled:opacity-50"
                >
                  {isPublishing
                    ? "Publishing..."
                    : formStatus === "published"
                      ? "Published"
                      : "Publish"}
                </button>


                <button
                  onClick={handleNewForm}
                  className="rounded-lg bg-slate-200 px-4 py-2 text-slate-800"
                >
                  + New Form
                </button>

                <button
                  onClick={() => {
                    setIsPreview((current) => !current);
                    setSubmittedData(null);
                  }}
                  className="rounded-lg border px-4 py-2"
                >
                  {isPreview ? "Back to Builder" : "Preview"}
                </button>

                <button
                  onClick={exportJSON}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-white"
                >
                  Export JSON
                </button>

                <label className="cursor-pointer rounded-lg border px-4 py-2">
                  Import JSON
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={importJSON}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {isMenuOpen && (
              <div className="mt-4 flex flex-col gap-2 md:hidden">
                <button
                  onClick={() => {
                    handleSaveForm();
                    setIsMenuOpen(false);
                  }}
                  disabled={isSaving}
                  className="rounded-lg bg-green-600 px-3 py-2 text-white"
                >
                  {isSaving ? "Saving..." : "Save Form"}
                </button>

                <button
                  onClick={() => {
                    handleNewForm();
                    setIsMenuOpen(false);
                  }}
                  className="rounded-lg bg-slate-200 px-4 py-2"
                >
                  + New Form
                </button>

                <button
                  onClick={() => {
                    setIsPreview((current) => !current);
                    setSubmittedData(null);
                    setIsMenuOpen(false);
                  }}
                  className="rounded-lg border px-4 py-2"
                >
                  {isPreview ? "Back to Builder" : "Preview"}
                </button>

                <button
                  onClick={() => {
                    exportJSON();
                    setIsMenuOpen(false);
                  }}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-white"
                >
                  Export JSON
                </button>

                <label className="cursor-pointer rounded-lg border px-4 py-2 text-center">
                  Import JSON
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      importJSON(e);
                      setIsMenuOpen(false);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {saveMessage && (
              <p
                className={`mt-2 text-sm ${saveMessageType === "error"
                  ? "text-red-500"
                  : "text-green-600"
                  }`}
              >
                {saveMessage}
              </p>
            )}

            {importError && (
              <p role="alert" className="mt-2 text-sm text-red-600">
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
                    draggable
                    onClick={() => addField(type)}
                    onDragStart={() => setDraggedFieldType(type)}
                    onDragEnd={() => setDraggedFieldType(null)}
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
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
                        {field.helpText && (
                          <p id={`${field.id}-help`} className="mt-1 text-sm text-slate-500">
                            {field.helpText}
                          </p>
                        )}
                        {errors[field.name]?.map((error, index) => (
                          <p
                            id={`${field.id}-error`}
                            key={index}
                            className="mt-1 text-sm text-red-600"
                            role="alert"
                          >
                            {errors[field.name]?.join(", ")}
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
                <div onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();

                    if (draggedFieldType) {
                      addField(draggedFieldType);
                      setDraggedFieldType(null);
                    }
                  }} className="min-h-[500px] space-y-4 rounded-lg border-2 border-dashed border-slate-300 p-4">
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
                        {field.helpText && (
                          <p className="mt-1 text-sm text-slate-500">
                            {field.helpText}
                          </p>
                        )}

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
                      className="flex flex-col items-center justify-between gap-2 rounded-lg border p-2"
                    >
                      <span className="text-sm font-bold">{form.title}</span>
                      <span
                        className={`text-xs font-medium ${form.status === "published"
                          ? "text-green-600"
                          : "text-amber-600"
                          }`}
                      >
                        {form.status || "draft"}
                      </span>
                      <div className="flex  gap-2">
                        <button
                          onClick={() => handleLoadForm(form._id)}
                          className="rounded bg-slate-100 px-1 py-1 border text-[12px]"
                        >
                          Load
                        </button>

                        <button
                          onClick={() => window.open(`/forms/${form._id}`, "_blank")}
                          className="rounded bg-slate-100 px-1 py-1 border text-[12px]"
                        >
                          Open Form
                        </button>

                        <button
                          onClick={() => handleCopyLink(form._id)}
                          className="rounded bg-slate-100 px-1 py-1 border text-[12px]"
                        >
                          Copy Link
                        </button>

                        <button
                          onClick={() => handleDeleteForm(form._id)}
                          className="rounded bg-slate-100 px-1 py-1 border text-[12px]"
                        >
                          Delete
                        </button>
                      </div>
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

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Default Value
                    </label>
                    <input
                      value={selectedField.defaultValue ?? ""}
                      onChange={(e) =>
                        updateSelectedField("defaultValue", e.target.value)
                      }
                      className="w-full rounded-lg border p-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Help Text
                    </label>
                    <input
                      value={selectedField.helpText ?? ""}
                      onChange={(e) =>
                        updateSelectedField("helpText", e.target.value)
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
                      <div className="space-y-3">
                        <label className="font-medium">
                          Match Conditions
                        </label>

                        {/* AND / OR selection */}
                        <select
                          className="w-full rounded-lg border p-2"
                          value={selectedField.conditionLogic || "AND"}
                          onChange={(e) =>
                            updateSelectedField("conditionLogic", e.target.value)
                          }
                        >
                          <option value="AND">Match ALL conditions (AND)</option>
                          <option value="OR">Match ANY condition (OR)</option>
                        </select>

                        {/* Multiple conditions */}
                        {selectedField.conditions.map((condition, index) => (
                          <div
                            key={index}
                            className="space-y-2 rounded-lg border p-3"
                          >
                            <label className="text-sm font-medium">
                              Condition {index + 1}
                            </label>

                            {/* Source field */}
                            <select
                              className="w-full rounded-lg border p-2"
                              value={condition.fieldId}
                              onChange={(e) => {
                                const updated = [...selectedField.conditions];

                                updated[index] = {
                                  ...condition,
                                  fieldId: e.target.value,
                                };

                                updateSelectedField("conditions", updated);
                              }}
                            >
                              <option value="">Select field</option>

                              {fields
                                .filter((field) => field.id !== selectedField.id)
                                .map((field) => (
                                  <option key={field.id} value={field.id}>
                                    {field.label}
                                  </option>
                                ))}
                            </select>

                            {/* Operator */}
                            <select
                              className="w-full rounded-lg border p-2"
                              value={condition.operator}
                              onChange={(e) => {
                                const updated = [...selectedField.conditions];

                                updated[index] = {
                                  ...condition,
                                  operator: e.target.value,
                                };

                                updateSelectedField("conditions", updated);
                              }}
                            >
                              <option value="equals">Equals</option>
                              <option value="notEquals">Does not equal</option>
                              <option value="contains">Contains</option>
                              <option value="greaterThan">Greater than</option>
                              <option value="lessThan">Less than</option>
                              <option value="isEmpty">Is empty</option>
                            </select>

                            {/* Comparison value */}
                            {condition.operator !== "isEmpty" && (
                              <input
                                className="w-full rounded-lg border p-2"
                                placeholder="Comparison value"
                                value={condition.value ?? ""}
                                onChange={(e) => {
                                  const updated = [...selectedField.conditions];

                                  updated[index] = {
                                    ...condition,
                                    value: e.target.value,
                                  };

                                  updateSelectedField("conditions", updated);
                                }}
                              />
                            )}

                            {/* Remove condition */}
                            <button
                              type="button"
                              className="text-sm text-red-600"
                              onClick={() =>
                                updateSelectedField(
                                  "conditions",
                                  selectedField.conditions.filter(
                                    (_, i) => i !== index
                                  )
                                )
                              }
                            >
                              Remove Condition
                            </button>
                          </div>
                        ))}

                        {/* Add condition */}
                        <button
                          type="button"
                          className="w-full rounded-lg border p-2 text-sm"
                          onClick={() =>
                            updateSelectedField("conditions", [
                              ...selectedField.conditions,
                              {
                                fieldId: "",
                                operator: "equals",
                                value: "",
                              },
                            ])
                          }
                        >
                          + Add Condition
                        </button>
                      </div>
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
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Regex Pattern
                        </label>
                        <input
                          value={selectedField.pattern ?? ""}
                          onChange={(e) =>
                            updateSelectedField("pattern", e.target.value)
                          }
                          placeholder="Example: ^[A-Za-z]+$"
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
