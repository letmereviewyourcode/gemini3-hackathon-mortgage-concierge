# Pre-Submission Checklist

> **Gemini Mortgage Concierge** | Before Submitting

---

## ✅ Code Verification

- [ ] `grep -r "gemini-3" agents/` returns model names
- [ ] `grep -r "inlineData" agents/property-vision/` shows multimodal
- [ ] `grep -r "fileUri" agents/underwriter/` shows Files API
- [ ] `grep -r "FAILED" agents/underwriter/` shows QA loop

---

## ✅ Environment

- [ ] `.env.example` exists (no real secrets)
- [ ] `.gitignore` excludes `.env`, `node_modules`, `*.log`
- [ ] No hardcoded API keys in source files

---

## ✅ Startup Test

```bash
# From repo root
./start.sh

# Verify all agents respond
curl http://localhost:4020/health
curl http://localhost:4023/.well-known/agent-card.json
curl http://localhost:4001/.well-known/agent-card.json
curl http://localhost:4024/.well-known/agent-card.json
```

---

## ✅ Demo Flow Test

1. [ ] Frontend loads without errors
2. [ ] Sample images load (3 photos)
3. [ ] Analysis completes in < 60 seconds
4. [ ] Decision shows "Approved" for good scenario
5. [ ] Files API indicator visible
6. [ ] PDF export works

---

## ✅ Documentation

- [ ] README.md has quickstart
- [ ] JUDGES.md has code evidence
- [ ] VIDEO_SCRIPT.md is complete
- [ ] DEVPOST_SUBMISSION.md ready to paste

---

## ✅ Repository

- [ ] Git initialized
- [ ] Initial commit made
- [ ] Pushed to GitHub
- [ ] Repository is PUBLIC

---

## ✅ Devpost

- [ ] Project title entered
- [ ] 200-word description pasted
- [ ] "Built with" includes "Gemini API"
- [ ] GitHub link added (or AI Studio link)
- [ ] Demo video uploaded (if available)
- [ ] Screenshots uploaded

---

## Final Sanity Check

```bash
# Clean test from scratch
rm -rf node_modules agents/*/node_modules broker/node_modules
./start.sh

# If this works, you're ready to submit
```
