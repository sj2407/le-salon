---
name: commit
description: Create a properly formatted git commit
disable-model-invocation: true
---

**Purpose**: Create a properly formatted git commit.

**Instructions**:

You are committing changes for: **[DESCRIPTION]**

## 1. REVIEW CHANGES

```bash
git status
git diff
```

## 2. STAGE FILES EXPLICITLY

Do NOT use `git add .` (might include secrets)

```bash
git add src/path/to/file1.jsx
git add src/path/to/file2.jsx
git add supabase/migrations/file.sql
```

## 3. CHECK COMMIT HISTORY FOR STYLE

```bash
git log --oneline -10
```

Study the commit message patterns used in this project.

## 4. MATCH THE COMMIT STYLE

Write commit message matching the project's style:
- Same verb usage (Add, Fix, Update, etc.)
- Same length/detail level
- Same structure

```bash
git commit -m "$(cat <<'EOF'
[Action verb] [description matching project style]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

## 5. VERIFY SUCCESS

```bash
git status
git log -1
```

## 6. DO NOT PUSH

Create commit but DO NOT push unless user explicitly requests it.
