const key = 'nz-tech-route-checklist-v1';
const boxes = [...document.querySelectorAll('[data-checklist] input')];
const saved = JSON.parse(localStorage.getItem(key) || '[]');
boxes.forEach((box, index) => {
  box.checked = saved.includes(index);
  box.addEventListener('change', () => {
    const next = boxes.map((item, i) => item.checked ? i : null).filter(i => i !== null);
    localStorage.setItem(key, JSON.stringify(next));
  });
});
