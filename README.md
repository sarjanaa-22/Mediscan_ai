# MediScan Health

Build a complete production-ready healthcare SaaS web application called:

MediScan AI – AI-Powered Prescription Digitization & Clinical Decision Support System

Goal

Create a modern full-stack healthcare platform that can:

Digitize handwritten prescriptions

Recognize extremely poor doctor handwriting

Extract medicines using AI

Verify medicines against a medicine database

Analyze laboratory reports

Generate downloadable PDF reports

Display analytics dashboards

Support user authentication

Be deployable to Vercel (Frontend) and Render (Backend)

Generate a fully functional application with no placeholder pages.

UI/UX Requirements

Create a premium healthcare design similar to modern medical SaaS platforms.

Requirements:

Modern medical dashboard

Responsive mobile and desktop design

Dark mode

Light mode

Smooth animations

Professional color palette

Sidebar navigation

Top navbar

Search functionality

Loading skeletons

Toast notifications

Pages

Landing Page

Sections:

Hero Section

Features

OCR Technology

Medicine Verification

Lab Report Analysis

Dashboard Preview

Contact

Footer

CTA:
"Upload Prescription"

Authentication

Login Page

Fields:

Email

Password

Register Page

Fields:

Name

Email

Password

Confirm Password

JWT authentication support.

Dashboard

Display cards:

Total Prescriptions Processed

Medicines Verified

OCR Accuracy

Lab Reports Analyzed

Charts:

OCR Accuracy Trend

Medicine Verification Statistics

Monthly Usage Analytics

Recent Activity Table.

Prescription Scanner

Features:

Drag and Drop Upload

Camera Upload

Image Preview

OCR Processing

Display:

Left Side:

Uploaded Prescription Image

Right Side:

Extracted Text

Editable OCR text.

Show:

OCR Confidence Score

Processing Time

Recognition Quality

OCR Engine Section

Display results from:

TrOCR

PaddleOCR

EasyOCR

Show:

Individual OCR outputs

Confidence score per engine

Final merged output

Display confidence comparison chart.

Medicine Detection Page

Extract medicines automatically.

Implement:

Exact Matching

Example:
Paracetamol → Paracetamol

Abbreviation Expansion

PCM → Paracetamol
AZ → Azithromycin
AMOX → Amoxicillin
MET → Metformin

Fuzzy Matching

Handle OCR mistakes:

Paracetmol → Paracetamol
Azithromcin → Azithromycin
Amoxicilin → Amoxicillin

Show:

Match Confidence

Suggested Medicine

Manual Correction Option

Medicine Verification Page

Display:

Medicine Name
Generic Name
Drug Class
Uses
Dosage
Side Effects
Manufacturer

Highlight:

Verified Medicines

Unknown Medicines

Potential OCR Errors

Lab Report Analyzer

Upload PDF/Image lab reports.

Extract:

Hemoglobin

Glucose

Cholesterol

HDL

LDL

Triglycerides

Creatinine

WBC

Platelets

Display:

Parameter
Value
Reference Range
Status

Status:

Normal

High

Low

Provide simple AI explanation for each result.

Reports Page

Display:

Prescription History

Lab Report History

Verification Reports

Actions:

View

Download PDF

Delete

Backend Architecture

Backend Framework:

FastAPI

Database:

SQLite

ORM:

SQLAlchemy

Authentication:

JWT

Database Tables

users

id

username

email

password_hash

created_at

prescriptions

id

user_id

image_path

extracted_text

confidence_score

created_at

medicines

id

medicine_name

generic_name

drug_class

indications

dosage

side_effects

manufacturer

lab_reports

id

user_id

report_path

extracted_data

created_at

verification_logs

id

prescription_id

medicine_name

match_score

verification_status

created_at

API Endpoints

POST /upload-prescription

POST /extract-text

POST /verify-medicines

POST /analyze-lab-report

GET /medicine-search

GET /dashboard-stats

POST /login

POST /register

OCR Integration

Use:

TrOCR

PaddleOCR

EasyOCR

Pipeline:

Image preprocessing

OCR execution

Result aggregation

Confidence scoring

Final extraction

Show OCR confidence visually.

PDF Reports

Generate downloadable reports including:

Patient Details

Prescription Image

OCR Results

Medicine Verification

Lab Analysis

Confidence Scores

Dashboard Analytics

Include:

Line Charts

Pie Charts

Bar Charts

Using Recharts.

Deployment

Generate:

Complete folder structure

React Frontend

FastAPI Backend

Tailwind CSS configuration

SQLAlchemy models

API routes

Requirements.txt

Package.json

Dockerfile

Docker Compose

.env.example

README.md

Application must be fully runnable in VS Code with clear setup instructions and production-ready code structure.

Generate all pages, components, APIs, models, and deployment configuration required for a complete working healthcare application.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ai-mediscan.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4f35807d-7822-4de0-800e-18c95a156285).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
