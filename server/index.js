import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import Form from "./models/Form.js";
import Response from "./models/Response.js";
import { isFieldVisible } from "./utils/conditions.js";
import { validateField } from "./utils/validation.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));


// Test route
app.get("/api/abc", (req, res) => {
  res.json({ message: "FormCraft API is running" });
});

// Create form
app.post("/api/forms", async (req, res) => {
  try {
    const { title, fields } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      !Array.isArray(fields)
    ) {
      return res.status(400).json({
        message: "A valid title and fields array are required.",
      });
    }
    const form = await Form.create({
      title: title.trim(),
      fields,
    });

    res.status(201).json({
      message: "Form saved successfully",
      form,
    });
  } catch (error) {
    console.error("Create form error:", error);

    res.status(500).json({
      message: "Failed to save form.",
    });
  }
});





/* Update form */
app.put("/api/forms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, fields } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid form ID.",
      });
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      !Array.isArray(fields)
    ) {
      return res.status(400).json({
        message: "A valid title and fields array are required.",
      });
    }

    const form = await Form.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        fields,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!form) {
      return res.status(404).json({
        message: "Form not found.",
      });
    }

    res.json({
      message: "Form updated successfully",
      form,
    });
  } catch (error) {
    console.error("Update form error:", error);

    res.status(500).json({
      message: "Failed to update form.",
    });
  }
});



/* Get all saved forms */
app.get("/api/forms", async (req, res) => {
  try {
    const forms = await Form.find()
      .select("title status createdAt updatedAt")
      .sort({ updatedAt: -1 });

    res.json(forms);
  } catch (error) {
    console.error("Get forms error:", error);

    res.status(500).json({
      message: "Failed to retrieve forms.",
    });
  }
});

/* Get one form by ID */
app.get("/api/forms/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid form ID.",
      });
    }

    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        message: "Form not found.",
      });
    }

    res.json(form);
  } catch (error) {
    console.error("Get form error:", error);

    res.status(500).json({
      message: "Failed to retrieve form.",
    });
  }
});



/* Publish form */
app.patch("/api/forms/:id/publish", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid form ID.",
      });
    }

    const form = await Form.findByIdAndUpdate(
      id,
      { status: "published" },
      { new: true, runValidators: true }
    );

    if (!form) {
      return res.status(404).json({
        message: "Form not found.",
      });
    }

    res.json({
      message: "Form published successfully",
      form,
      shareUrl: `http://localhost:5173/forms/${form._id}`,
    });
  } catch (error) {
    console.error("Publish form error:", error);

    res.status(500).json({
      message: "Failed to publish form.",
    });
  }
});




/* Get published form for renderer */
app.get("/api/forms/:id/published", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid form ID.",
      });
    }

    const form = await Form.findOne({
      _id: id,
      status: "published",
    });

    if (!form) {
      return res.status(404).json({
        message: "Published form not found.",
      });
    }

    res.json({
      message: "Published form retrieved successfully",
      form,
    });
  } catch (error) {
    console.error("Get published form error:", error);

    res.status(500).json({
      message: "Failed to retrieve published form.",
    });
  }
});



/* Submit form response */
app.post("/api/forms/:id/submit", async (req, res) => {
  try {
    const { id } = req.params;
    const answers = req.body;

    const form = await Form.findOne({
      _id: id,
      status: "published",
    });

    if (!form) {
      return res.status(404).json({
        message: "Published form not found.",
      });
    }  

    if (
      !answers ||
      typeof answers !== "object" ||
      Array.isArray(answers)
    ) {
      return res.status(400).json({
        message: "Invalid form answers.",
      });
    }

    const errors = {};
    const visibleFields = form.fields.filter((field) =>
      isFieldVisible(field, form.fields, answers)
    );

    visibleFields.forEach((field) => {
      const value = answers[field.name];
      const fieldErrors = validateField(field, value);

      if (fieldErrors.length > 0) {
        errors[field.name] = fieldErrors;
      }
    });

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: "Please fix the form errors.",
        errors,
      });
    }

    const submittedAnswers = {};

    visibleFields.forEach((field) => {
      if (answers[field.name] !== undefined) {
        submittedAnswers[field.name] = answers[field.name];
      }
    });

    const response = await Response.create({
      formId: form._id,
      answers: submittedAnswers,
    });

    res.status(201).json({
      message: "Form submitted successfully.",
      response,
    });
  } catch (error) {
    console.error("Submit form error:", error);

    res.status(500).json({
      message: "Failed to submit form.",
    });
  }
});


/* Get form responses */
app.get("/api/forms/:id/responses", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid form ID.",
      });
    }

    const responses = await Response.find({
      formId: id,
    }).sort({ createdAt: -1 });

    res.json(responses);
  } catch (error) {
    console.error("Get responses error:", error);

    res.status(500).json({
      message: "Failed to retrieve responses.",
    });
  }
});



const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();



