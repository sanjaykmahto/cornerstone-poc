export function addLabelToToolbar({
  id,
  title,
  container,
  paddings,
}) {
  const label = document.createElement('label');

  label.id = id;
  label.innerText = title;

  if (paddings) {
    label.style.paddingTop = `${paddings.top}px`;
    label.style.paddingRight = `${paddings.right}px`;
    label.style.paddingBottom = `${paddings.bottom}px`;
    label.style.paddingLeft = `${paddings.left}px`;
  }

  container = container ?? document.getElementById('demo-toolbar');
  container.append(label);

  return label;
}
