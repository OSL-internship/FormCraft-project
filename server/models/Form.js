import mongoose from "mongoose";

const conditionSchema = new mongoose.Schema(
  {
    fieldId: {
      type: String,
      required: true,
    },
    operator: {
      type: String,
      required: true,
      enum: [
        "equals",
        "notEquals",
        "contains",
        "greaterThan",
        "lessThan",
        "isEmpty",
      ],
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: "",
    },
  },
  { _id: false }
);

const fieldSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "Text",
        "Textarea",
        "Number",
        "Email",
        "Select",
        "Radio Group",
        "Checkbox",
        "Date",
      ],
    },
    label: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    placeholder: {
      type: String,
      default: "",
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: {
      type: [String],
      default: [],
    },
    minLength: {
      type: String,
      default: "",
    },
    maxLength: {
      type: String,
      default: "",
    },
    minValue: {
      type: String,
      default: "",
    },
    maxValue: {
      type: String,
      default: "",
    },
    pattern: {
      type: String,
      default: "",
    },
    errorMessage: {
      type: String,
      default: "",
    },
    conditions: {
      type: [conditionSchema],
      default: [],
    },
  },
  { _id: false ,id:false }
);

const formSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    fields: {
      type: [fieldSchema],
      default: [],
    },
     status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
  },
  { timestamps: true }
);

const Form = mongoose.model("Form", formSchema);

export default Form;

