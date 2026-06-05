# Test Matrix Taxonomy（测试矩阵分类法）

使用这些维度，把 branch diff 转成 exhaustive browser test matrix。不是每个维度都适用于每个 change；选择 diff 实际触及的维度，但偏向 coverage。目标是测试**完整 user journeys**，而不是 isolated widgets。

## 1. Journeys（matrix 的主干）

对每个 user-visible change，追踪真实用户从头到尾走过的完整路径：

- **Entry**：用户如何到达？（link、redirect、notification、deep link）
- **Action**：用户做什么？（click、fill、submit、upload、drag）
- **Result**：应该发生什么？（navigation、state change、message、side effect）
- **Destination**：是否落到*正确*位置，*正确* item 是否 focused/scrolled into view，并显示*正确* data？
- **Aftermath**：追踪 side effects 到真实最终状态。如果 email/notification/job 触发了，它是否到达正确 recipient，且 content 合理？如果创建了 record，它是否在所有应出现的地方正确显示？

Email test 是 canonical example："an email sends" 不算通过。需要 right recipient、click-through 滚到正确 message、content 合理、whole flow coheres。

## 2. Functional checks（功能检查）："does it work?"

- Primary content renders；headings/titles 存在。
- Forms 有 expected fields；validation 接受 good input，并用清晰 messages 拒绝 bad input。
- Buttons/links 去到它们声称的位置；没有 dead-ends。
- 显示的 data 与保存的 data 一致（round-trip create -> view -> edit -> view）。
- Journey 期间没有 console errors 或 failed network requests（`agent-browser errors`）。
- Auth/permission boundaries 成立（正确 users 能/不能执行该操作）。

## 3. Experiential checks（体验检查）："does it feel right?"

- 是否符合 product vision 和 existing UX patterns？
- Copy 是否清晰，并与 app 其余部分一致？
- Loading、success 和 transition states 是否存在且不令人意外？
- Layout 看起来是否 intentional，还是有明显 broken/misaligned？
- 真实用户不经解释是否能理解该做什么？

### Persona paper cuts（Persona 小摩擦）

以每个 primary persona（来自 STRATEGY.md "Who it's for"、VISION.md 或 persona doc）的身份走完每个 flow。**Paper cut** 是能通过 functional tests、但会降低该 persona 体验的小摩擦：confusing label、extra click、unexpected jump、slow-feeling step、missing feedback、不符合其思维方式的 copy。记录 paper cut、哪个 persona 感受到它，以及 severity。Functionally-passing scenarios 仍可能有 paper cuts。

## 4. Edge、error 和 empty states

- **Empty：** 还没有 data；是否有 sensible empty state，而不是 blank/broken page？
- **Boundary：** 超长文本、zero、max values、special characters、unicode。
- **Error：** server error、validation failure、expired session、lost network 是否被 graceful handling？
- **Concurrency / re-entry（并发 / 重入）：** double-submit、back button、refresh mid-flow、stale tab。

## 5. Cross-cutting（横切检查）

- **Responsiveness：** mobile 和 desktop widths 下的 key pages。
- **Accessibility：** focus order、inputs labels、新 interactive elements 的 keyboard operability。
- **Regression：** change 可能合理破坏的 adjacent journeys，即使没有直接修改。

## Mapping files to routes（文件到 routes 的映射）

| Changed file（变更文件） | Routes to test（要测试的 routes） |
|--------------|----------------|
| `app/views/<x>/*`, `src/app/<x>/*` | The pages for `<x>` (index, show, new, edit) |
| component files | Every page that renders the component |
| layout / global stylesheet | All key pages (visual regression) — at minimum the homepage |
| controller / route handler | The routes it serves |
| helper / util used in views | Pages relying on it |
| JS / Stimulus / client controller | Pages where that behavior is wired |

从此 mapping 构建 URL list，然后把每个 URL 扩展成上面的 journeys。
