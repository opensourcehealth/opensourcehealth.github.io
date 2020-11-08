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

function warningByList(warnings) {
	if (warnings.length == 0) {
		return
	}
	var firstString = warnings[0]
	for (var warning of warnings) {
		console.log(warning)
	}
	if (gAlertSet.has(firstString)) {
		return
	}
	gAlertSet.add(firstString)
	warnings.push('Further warnings about this will be sent to the debugging console only.')
	alert(warnings.join('\n'))
}
