import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "./services/api";

function FormRenderer() {
    const { id } = useParams();

    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchForm() {
            try {
                const data = await apiRequest(`/forms/${id}`);
                setForm(data.form || data);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }

        fetchForm();
    }, [id]);

    if (loading) return <p>Loading form...</p>;

    if (error) return <p>{error}</p>;

    if (!form) return <p>Form not found.</p>;

    function renderField(field) {
        switch (field.type) {
            case "Text":
                return <input type="text" className="w-full rounded-lg border border-slate-300 p-2"/>;

            case "Email":
                return <input type="email" className="w-full rounded-lg border border-slate-300 p-2"/>;

            case "Number":
                return <input type="number" className="w-full rounded-lg border border-slate-300 p-2"/>;

            case "Textarea":
                return <textarea rows={3} className="w-full rounded-lg border border-slate-300 p-2"/>;

            case "Date":
                return <input type="date" className="w-full rounded-lg border border-slate-300 p-2"/>;

            case "Select":
                return (
                    <select>
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
                                <input type="radio" name={field.name} value={option} />
                                {option}
                            </label>
                        ))}
                    </div>
                );

            case "Checkbox":
                return <input type="checkbox" className="w-full rounded-lg border border-slate-300 p-2"/>;

            default:
                return null;
        }
    }


    return (
        <div className="min-h-screen bg-slate-100 p-6">
            <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow">
                <h1 className="mb-6 text-2xl font-bold">
                    {form.title}
                </h1>

                {form.fields.map((field) => (
                    <div key={field.id} className="mb-5">
                        <label className="font-medium">
                            {field.label}
                            {field.required && (
                                <span className="text-red-500"> *</span>
                            )}
                        </label>

                        <div className="mt-2">
                            {renderField(field)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default FormRenderer;