# FormCraft – Drag-and-Drop Form Builder

FormCraft is a form builder that helps users create, customize, preview, and manage forms using drag and drop.

## Features

- Create forms and reorder fields using drag and drop.
- Customize field properties like label, placeholder, default value, and help text.
- Supports Text, Textarea, Number, Email, Select, Radio, Checkbox, and Date fields.
- Conditional logic with AND/OR operators.
- Field validation, including required fields, email, length, number, and regex validation.
- Import and export forms using JSON.
- Save, load, update, and delete forms.
- Preview forms and manage submitted responses.
- Responsive design for desktop and mobile.

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS, JavaScript

**Backend:** Node.js, Express.js, MongoDB, Mongoose

## Installation and Setup

### Prerequisites
- Node.js and npm
- MongoDB

### Frontend Setup

```bash

npm install
```

Create a `.env` file and add:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

### Backend Setup

```bash
cd server
npm install
```

Create a `.env` file and add:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

Start the backend:

```bash
npm start
```

## Project Purpose

This project was built to make form creation and response management simple using drag and drop, conditional logic, and validation.
