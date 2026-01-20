# Judge FAQ

## Q: Is the "Files API" really used, or is it simulated?
**A: It is 100% real.** 
You can verify this in the "Underwriter" agent logs (if running locally) or by observing the processing time and context meter in the UI. 
- The agent uploads `regulations.txt` (the Fannie Mae guide) to Google's infrastructure.
- It receives a `fileUri`.
- It passes this URI in the `generativeModel.generateContent` call.
- The ~85k token count shown in the UI is accurate.

## Q: Why do I need an Access Code?
**A:** Because we are using the **real Gemini 3.0 Pro** and **Flash** models for *every single request*, including the "Demo Scenarios". We do not mock responses. This ensures you are seeing the actual model performance, but it also incurs costs. The gate prevents bot abuse.

## Q: What happens if the demo fails?
**A:** Live demos can be unpredictable due to network or rate limits.
- **Retry**: Wait 60 seconds (we have a rate limiter) and try again.
- **Fallback**: Watch the **3-minute video** included in the submission. It captures the exact same flow running on the same infrastructure.

## Q: How is "Multimodal" used?
**A:** We do not describe the image to the model using text. We send the **base64 image data** directly to Gemini 3.0 Flash using the `inlineData` parameter. The model "sees" the pixels to determine if there is mold, water damage, or if the finish is "high quality".

## Q: Can I run this locally?
**A:** Yes! The repository includes a `start.sh` script. You will need your own `GEMINI_API_KEY`.
1. `git clone`
2. `cp .env.example .env` (Add Key)
3. `./start.sh`
