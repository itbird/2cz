/* global CMS, createClass, h */
/* eslint-disable no-alert -- Confirm before replacing the author's existing text. */
const Markdown = CMS.getWidget('markdown')
const ImportedMarkdown = createClass({
  render() {
    const handleImport = async (event) => {
      const file = event.target.files[0]
      if (!file)
        return
      if (file.size > 2 * 1024 * 1024) {
        alert('文章超过 2 MB，请缩小后重试。')
        return
      }
      if (this.props.value && !confirm('用文件正文替换当前正文？'))
        return
      const text = (await file.text()).replace(/^\uFEFF/, '')
      const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
      this.props.onChange(body)
      event.target.value = ''
    }
    return h('div', {}, h('label', { style: { display: 'block', padding: '12px', background: '#f0f4ee', marginBottom: '12px', borderRadius: '4px' } }, '导入 Markdown 正文（标题和日期请在上方填写） ', h('input', { type: 'file', accept: '.md,.markdown,text/markdown', onChange: handleImport })), h(Markdown.control, this.props))
  },
})
CMS.registerWidget('markdown_file', ImportedMarkdown, Markdown.preview)
CMS.registerPreviewStyle('/admin/preview.css')
CMS.init()
