export function createNetworkIntroActions({
  dialog,
  getLoadingKey = () => '',
  setLoadingKey = () => {},
  callAi,
  getApiKey,
  relationLabel = value => value,
  genId = () => `intro_${Date.now().toString(36)}`,
  currentTime = () => new Date().toISOString(),
  save = () => {},
  showToast = () => {},
  clipboard = globalThis.navigator?.clipboard,
}) {
  async function generate() {
    const edge = dialog.selectedEdge;
    const target = dialog.resume;
    const introducer = edge?.otherResume;
    if (!edge || !target || !introducer) {
      showToast('请先选择一个可引荐候选人', 'error');
      return false;
    }
    const loadingKey = `${target.id || ''}-${introducer.id || ''}`;
    if (getLoadingKey() === loadingKey) return false;
    setLoadingKey(loadingKey);
    dialog.error = '';
    try {
      const relation = relationLabel(edge.relations[0]);
      const message = await callAi({
        task: 'network-intro-message',
        getApiKey,
        temperature: 0.35,
        timeout: 20000,
        messages: [{ role: 'system', content: '你是一个情商高、懂分寸的资深猎头。请只输出微信消息正文，不要解释。' }, {
          role: 'user',
          content: `请写一段发给线人的微信消息，150个中文字符以内，语气真诚、不势利、不给压力。\n\n目标候选人：${target.name || '候选人'}\n目标候选人摘要：${target.candidateSummary || target.candidateProfileText || '暂无'}\n线人候选人：${introducer.name || '候选人'}\n线人状态：${introducer.evaluation || 'pending'}\n线人摘要：${introducer.candidateSummary || introducer.candidateProfileText || '暂无'}\n共同关系：${relation}\n当前机会：${dialog.job?.company || ''} / ${dialog.pos?.name || ''}\n岗位信息：${dialog.pos?.detail || ''}\n\n要求：\n1. 先自然寒暄。\n2. 巧妙提到发现双方有共同经历。\n3. 请对方帮忙探探目标候选人近期是否看机会，或方便时帮忙引荐微信。\n4. 不要显得功利，不要承诺简历中没有的信息。`,
        }],
      });
      const text = String(message || '').trim();
      if (!text) throw new Error('未生成有效话术');
      if (!Array.isArray(target.networkIntroDrafts)) target.networkIntroDrafts = [];
      target.networkIntroDrafts.unshift({
        id: genId(), targetResumeId: target.id, introducerResumeId: introducer.id,
        relationLabel: relation, message: text, generatedAt: currentTime(),
      });
      dialog.draft = text;
      save();
      return true;
    } catch (error) {
      dialog.error = error.message || '引荐话术生成失败';
      return false;
    } finally {
      setLoadingKey('');
    }
  }

  async function copy(text) {
    const value = String(text || '').trim();
    if (!value) return false;
    try {
      await clipboard.writeText(value);
      showToast('引荐话术已复制');
      return true;
    } catch {
      showToast('复制失败，请手动选中文字复制', 'error');
      return false;
    }
  }

  return { generate, copy };
}

if (typeof window !== 'undefined') window.WorkBuddyNetworkIntroActions = { createNetworkIntroActions };
