const toolboxColors = ['blue', 'rose', 'emerald', 'amber', 'teal'];
const toolboxColorClasses = toolboxColors.flatMap(color => [
  `bg-${color}-50`,
  `bg-${color}-50/40`,
  `bg-${color}-600`,
  `border-${color}-100`,
  `border-${color}-200`,
  `border-${color}-400`,
  `focus:border-${color}-400`,
  `focus:ring-${color}-100`,
  `hover:bg-${color}-100`,
  `hover:bg-${color}-700`,
  `hover:border-${color}-200`,
  `ring-${color}-100`,
  `text-${color}-600`,
]);

module.exports = {
  content: ['./index.html', './src/**/*.{js,mjs,html}'],
  safelist: toolboxColorClasses,
  theme: { extend: {} },
  plugins: [],
};
