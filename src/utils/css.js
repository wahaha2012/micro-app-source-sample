/**
 * 修改CSS规则，添加前缀
 * @param {*} rule css规则
 * @param {*} prefix 前缀
 * @returns {String}
 */
export function scopedStyleRule(rule, prefix) {
  // 获取CSS规则对象的选择和内容
  const { selectorText, cssText } = rule;

  // 处理顶层选择器，如body，html都转换为micro-app[name=xxx]
  if (/^((html[\s>~,]+body)|(html|body|:root))$/.test(selectorText)) {
    return cssText.replace(/^((html[\s>~,]+body)|(html|body|:root))/, prefix);
  } else if (selectorText === "*") {
    // 选择器 * 替换为 micro-app[name=xxx] *
    return cssText.replace("*", `${prefix} *`);
  }

  const builtInRootSelectorRE =
    /(^|\s+)((html[\s>~]+body)|(html|body|:root))(?=[\s>~]+|$)/;

  // 匹配查询选择器
  return cssText.replace(/^[\s\S]+{/, (selectors) => {
    return selectors.replace(/(^|,)([^,]+)/g, (all, $1, $2) => {
      // 如果含有顶层选择器，需要单独处理
      if (builtInRootSelectorRE.test($2)) {
        // body[name=xx]|body.xx|body#xx 等都不需要转换
        return all.replace(builtInRootSelectorRE, prefix);
      }
      // 在选择器前加上前缀
      return `${$1} ${prefix} ${$2.replace(/^\s*/, "")}`;
    });
  });
}

/**
 * 处理media和supports规则
 * @param {*} rule cssRules
 * @param {String} prefix 前缀
 * @param {String} packName Query类别
 * @returns
 */
export function scopedPackRule(rule, prefix, packName) {
  // 递归执行scopedRule，处理 media 和 supports 内部规则
  const result = scopedRule(Array.from(rule.cssRules), prefix);
  return `@${packName} ${rule.conditionText} {${result}}`;
}

/**
 * 依次处理每个cssRule
 * @param {*} rules cssRule
 * @param {String} prefix 前缀
 * @returns
 */
export function scopedRule(rules, prefix) {
  let result = "";
  // 遍历rules，处理每一条规则
  for (const rule of rules) {
    switch (rule.type) {
      case 1: // STYLE_RULE
        result += scopedStyleRule(rule, prefix);
        break;
      case 4: // MEDIA_RULE
        result += scopedPackRule(rule, prefix, "media");
        break;
      case 12: // SUPPORTS_RULE
        result += scopedPackRule(rule, prefix, "supports");
        break;
      default:
        result += rule.cssText;
        break;
    }
  }

  return result;
}
