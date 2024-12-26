/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/renderer/**/*.{html,js}'],
	theme: {
		extend: {}
	},
	plugins: [
		require('@tailwindcss/forms'),
		require('@tailwindcss/typography')
	]
}
