# Medcare Patient Experience & Healthcare Service Excellence Dashboard

This project provides a Medcare patient-experience analytics dashboard built from the supplied OP and IP survey Excel files.

## Architecture

- Frontend: React 18 + Vite + TypeScript + Recharts
- Backend: Node.js + Express
- Data ingestion: xlsx
- Analytics: custom healthcare sentiment and theme classification layer

## Folder structure

- backend/
  - src/
    - analytics/
    - data/
    - routes/
    - server.js
- frontend/
  - src/
- data/
  - Day wise OP Survey Report SMS OP Sharjha Cluster.xlsx
  - Day wise IP Survey Report SMS Sharjha Cluster.xlsx

## Local setup

1. Install backend dependencies:
   npm --prefix backend install
2. Install frontend dependencies:
   npm --prefix frontend install
3. Start backend:
   npm --prefix backend run dev
4. Start frontend:
   npm --prefix frontend run dev -- --host 0.0.0.0
5. Open the Vite URL displayed in the terminal.

## Production build

1. Build frontend:
   npm --prefix frontend run build
2. Start backend:
   npm --prefix backend start

## Data processing notes

- The backend loads the two supplied Excel workbooks and normalizes the data.
- It preserves source-specific OP/IP survey dimensions and keeps a unique Feedback ID per original survey response.
- NPS is derived only from valid 0–10 recommendation responses.
- Issue expansion supports multi-issue comments without double-counting NPS.
- The frontend applies hospital, patient type, specialty, date, and other filters dynamically.

## Required source files

Ensure these files exist in the root `data` folder:

- Day wise OP Survey Report SMS OP Sharjha Cluster.xlsx
- Day wise IP Survey Report SMS Sharjha Cluster.xlsx
