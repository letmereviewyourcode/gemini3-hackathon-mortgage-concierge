# Demo Assets

Sample property images and scenarios for the Gemini Mortgage Concierge hackathon demo.

## Multi-Image Scenarios (NEW)

The UI now loads **3 images per scenario** automatically when you click a sample button:

| Scenario | Description | Expected Result |
|----------|-------------|-----------------|
| 🏠 **Modern Home** | 3 high-quality modern property images | APPROVED (8-10/10) |
| 📦 **Average** | 3 dated but acceptable condition images | CONDITIONAL (5-7/10) |
| 🏚️ **Needs Work** | 3 images with visible issues | DENIED (1-4/10) |

## How to Use

### Option 1: Built-in Samples (Recommended)
1. Go to http://localhost:8100/projects/gemini-mortgage
2. Click any sample button (🏠 Modern Home, 📦 Average, 🏚️ Needs Work)
3. 3 images load automatically from Unsplash via CORS proxy
4. Click "Start Analysis"

### Option 2: Manual Upload
1. Drag up to 5 images into the upload area
2. Gemini 3.0 Flash analyzes all uploaded images
3. Click "Start Analysis"

## Unsplash Image URLs

Free, high-quality, and CORS-friendly:

```
# Modern Home (Excellent)
https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600
https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600
https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600

# Average Condition (Dated)
https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600
https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=600
https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=600

# Needs Work (Issues)
https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=600
https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600
https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600
```

## PDF Report Export

The enhanced report includes:
- Embedded property images
- Condition score visualization
- Regulation citations (Fannie Mae B3-6-02, etc.)
- QA verification checklist
- Print-ready professional layout

Click **Download PDF** in the Report tab to generate.
