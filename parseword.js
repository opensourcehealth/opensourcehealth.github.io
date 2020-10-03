//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function getAttributes(tokens) {
	var attributes = []
	var key = null
	var values = []
	for (token of tokens) {
		if (token == '=') {
			if (key != null) {
				attributes.push([key, values.slice(0, -1).join(' ')])
			}
			key = values[values.length - 1]
			values = []
		}
		else {
			values.push(token)
		}
	}
	if (key != null) {
		attributes.push([key, values.join(' ')])
	}
	return attributes
}

function getEndOfLine(text) {
	if (text.indexOf('\r\n') > -1) {
		return '\r\n'
	}
	return '\n'
}

function getJoinWord() {
	if (navigator.appVersion.indexOf("Win") > -1) {
		return '\r\n'
	}
	return '\n'
}

function getSplicedString(originalString, spliceIndex, spliceRemoved, spliceReplacement) {//should be moved to parseWord
	return originalString.slice(0, spliceIndex) + spliceReplacement + originalString.slice(spliceIndex + spliceRemoved)
}

function lengthCheck(word) {
	return word.length > 0
}
