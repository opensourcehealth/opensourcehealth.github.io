//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gAlertSet = new Set()

function warning(text, variables) {
	var textLines = text.split('\n')
	var maximumLength = Math.max(textLines.length, variables.length)
	for (itemIndex = 0; itemIndex < maximumLength; itemIndex++) {
		if (itemIndex < textLines.length) {
			console.log(textLines[itemIndex])
		}
		if (itemIndex < variables.length) {
			console.log(variables[itemIndex])
		}
	}
	if (gAlertSet.has(text)) {
		return
	}
	gAlertSet.add(text)
	var alertText = ''
	for (itemIndex = 0; itemIndex < maximumLength; itemIndex++) {
		if (itemIndex < textLines.length) {
			alertText += textLines[itemIndex] + '\n'
		}
		if (itemIndex < variables.length) {
			alertText += variables[itemIndex] + '\n'
		}
	}
	alertText += '\nFurther warnings about this will be sent to the debugging console only.'
	alert(alertText)
}
