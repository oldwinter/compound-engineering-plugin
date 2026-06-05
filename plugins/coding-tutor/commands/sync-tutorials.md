# Sync Coding Tutor Tutorials（同步 Coding Tutor Tutorials）

将你的 tutorials commit 并 push 到 GitHub repository，用于 backup 和 mobile reading。

## Instructions（说明）

1. **进入 tutorials repo**：`cd ~/coding-tutor-tutorials`

2. **检查 changes**：运行 `git status` 查看新增或修改内容

3. **如果有 changes**：
   - Stage all changes（暂存所有 changes）：`git add -A`
   - 创建 commit，message 总结新增/更新内容（例如 "Add tutorial on React hooks" 或 "Update quiz scores"）
   - Push to origin（推送到 origin）：`git push`

4. **如果没有 GitHub remote**：
   - 创建 repo：`gh repo create coding-tutor-tutorials --private --source=. --push`

5. **报告结果**：告诉用户同步了什么，或说明所有内容已经 up to date

## Notes（说明）

- tutorials repo 位于：`~/coding-tutor-tutorials/`
- 创建 GitHub repo 时始终使用 `--private`
- 这是你的 personal learning journey，记得保持备份！
