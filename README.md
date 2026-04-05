# TMK Modeller

A React-based graphical user interface designed to generate structured JSON models compliant with **Task-Method-Knowledge (TMK)** schemata.

## Features

* **Schema-Driven Forms**: Automatically generates validated UI components from JSON schemata.
* **Live JSON Preview**: Real-time visualisation of generated data with syntax highlighting.
* **Persistent Themes**: Supports light and dark modes via Material UI.
* **File Interoperability**: Capability to load existing JSON files for editing and save progress locally.
* **Flexible Layout**: Customisable workspace allowing users to swap form and preview panes.

## Tech Stack

* **Framework**: React
* **UI Library**: Material UI (MUI)
* **Validation**: AJV8

## Project Status: MVP

### Known Issues
* **Data Persistence**: Switching between form tabs currently triggers a state reset, causing data loss. (**Priority: High**)
* **Performance**: Large TMK models may cause lag during live preview updates; debouncing is implemented but requires further optimisation. (**Priority: Medium**)

## Getting Started

1.  **Install dependencies**:
    `npm install`
2.  **Run the application**:
    `npm start`
3.  **Usage**:
    Select a schema tab, populate fields, and use the 'Save JSON' button to export your model.
