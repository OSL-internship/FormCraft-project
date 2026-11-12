
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "./services/api";
import { validateField } from "./lib/validation";
import { isFieldVisible } from "./lib/conditionEvaluator";

function FormRenderer() {
    const { id } = useParams();

    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [formValues, setFormValues] = useState({});
    const [errors, setErrors] = useState({});
    const [touchedFields, setTouchedFields] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Fetch saved form
    useEffect(() => {
        async function fetchForm() {
            try {
                const data = await apiRequest(`/forms/${id}/published`);
                setForm(data.form || data);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }

        fetchForm();
    }, [id]);


    useEffect(() => {
        if (!successMessage && !error) return;

        const timer = setTimeout(() => {
            setSuccessMessage("");
            setError("");
        }, 3000);

        return () => clearTimeout(timer);
    }, [successMessage, error]);

    // Update form values
    function updateFormValue(name, value) {
        setFormValues((current) => ({
            ...current,
            [name]: value,
        }));
    }

    // Validate one field
    function validateOneField(field, value = formValues[field.name]) {
        const fieldErrors = validateField(field, value);

        setErrors((current) => {
            const updated = { ...current };

            if (fieldErrors.length > 0) {
                updated[field.name] = fieldErrors;
            } else {
                delete updated[field.name];
            }

            return updated;
        });

        return fieldErrors.length === 0;
    }

    // Render form fields
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
                    validateOneField(field, value);
                }
            },
            onBlur: () => {
                setTouchedFields((current) => ({
                    ...current,
                    [field.name]: true,
                }));

                validateOneField(field);
            },
            className: "w-full rounded-lg border border-slate-300 p-2",
        };

        switch (field.type) {
            case "Text":
                return <input type="text" {...commonProps} />;

            case "Email":
                return <input type="email" {...commonProps} />;

            case "Number":
                return <input type="number" {...commonProps} />;

            case "Textarea":
                return <textarea rows={3} {...commonProps} />;

            case "Date":
                return <input type="date" {...commonProps} />;

            case "Select":
                return (
                    <select {...commonProps}>
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
                    <div className="space-y-2">
                        {(field.options || []).map((option) => (
                            <label key={option} className="flex gap-2">
                                <input
                                    type="radio"
                                    name={field.name}
                                    value={option}
                                    checked={formValues[field.name] === option}
                                    onChange={() => {
                                        updateFormValue(field.name, option);

                                        if (touchedFields[field.name]) {
                                            validateOneField(field, option);
                                        }
                                    }}
                                />
                                {option}
                            </label>
                        ))}
                    </div>
                );

            case "Checkbox":
                return (
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            name={field.name}
                            checked={Boolean(formValues[field.name])}
                            onChange={(e) => {
                                const value = e.target.checked;
                                updateFormValue(field.name, value);

                                if (touchedFields[field.name]) {
                                    validateOneField(field, value);
                                }
                            }}
                        />
                        {field.label}
                    </label>
                );

            default:
                return null;
        }
    }

    // Submit form
    async function handleSubmit(e) {
        e.preventDefault();

        const visibleFields = form.fields.filter((field) =>
            isFieldVisible(field, form.fields, formValues)
        );

        const updatedErrors = {};
        const updatedTouched = {};

        visibleFields.forEach((field) => {
            updatedTouched[field.name] = true;

            const fieldErrors = validateField(
                field,
                formValues[field.name]
            );

            if (fieldErrors.length > 0) {
                updatedErrors[field.name] = fieldErrors;
            }
        });

        setErrors(updatedErrors);
        setTouchedFields((current) => ({
            ...current,
            ...updatedTouched,
        }));

        if (Object.keys(updatedErrors).length > 0) {
            return;
        }

        try {
            setIsSubmitting(true);
            setSuccessMessage("");

            const data = await apiRequest(`/forms/${id}/submit`, {
                method: "POST",
                body: JSON.stringify(formValues),
            });

            setSuccessMessage(
                data.message || "Form submitted successfully!"
            );

            setFormValues({});
            setErrors({});
            setTouchedFields({});

        } catch (error) {
            if (error.errors && Object.keys(error.errors).length > 0) {
                setErrors(error.errors);

                setTouchedFields((current) => ({
                    ...current,
                    ...Object.fromEntries(
                        Object.keys(error.errors).map((fieldName) => [
                            fieldName,
                            true,
                        ])
                    ),
                }));

                setError("");
            } else {
                setError(error.message || "Unable to submit form. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }

    }

    if (loading) return <p>Loading form...</p>;

    if (error && !form) return <p>{error}</p>;

    if (!form) return <p>Form not found.</p>;

    return (
        <div className="min-h-screen bg-slate-100 p-6">
            <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow">

                <h1 className="mb-6 text-2xl font-bold">
                    {form.title}
                </h1>

                <form onSubmit={handleSubmit} noValidate>
                    {form.fields
                        .filter((field) =>
                            isFieldVisible(field, form.fields, formValues)
                        )
                        .map((field) => (
                            <div key={field.id} className="mb-5">
                                <label className="font-medium">
                                    {field.label}
                                    {field.required && (
                                        <span className="text-red-500"> *</span>
                                    )}
                                </label>

                                <div className="mt-2">
                                    {renderField(field)}

                                    {errors[field.name]?.map((message, index) => (
                                        <p
                                            key={index}
                                            className="mt-1 text-sm text-red-500"
                                        >
                                            {message}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        ))}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-4 rounded-lg bg-indigo-600 px-5 py-2 text-white disabled:opacity-50"
                    >
                        {isSubmitting ? "Submitting..." : "Submit Form"}
                    </button>
                </form>

                {successMessage && (
                    <p className="mt-4 text-green-600">
                        {successMessage}
                    </p>
                )}

                {error && form && (
                    <p className="mt-4 text-red-500">{error}</p>
                )}
            </div>
        </div>
    );
}

export default FormRenderer;
