export default function addButtonToToolbar({
  id,
  title,
  container,
  onClick,
}) {
  const button = document.createElement('button');

  button.id = id;
  button.innerText = title;
  button.onclick = onClick;

  container = container ?? document.getElementById('demo-toolbar');
  container.append(button);

  return button;
}
