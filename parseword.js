//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addSliceToWords(lineSlice, quoteSeparatedWords) {
	if (lineSlice.indexOf('=') != -1) {
		lineSlice = getLineWithEndspace(['/>', '>', '[', '{'], lineSlice)
	}
	snippets = lineSlice.replace(/=/g, ' = ').split(' ').filter(lengthCheck)
	pushArray(quoteSeparatedWords, snippets)
}

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

function getLineWithEndspace(endWords, line) {
	for (endWord of endWords) {
		if (line.endsWith(endWord)) {
			spaceThenEndWord = ' ' + endWord
			if (!line.endsWith(spaceThenEndWord)) {
				return line.slice(0, line.length - endWord.length) + spaceThenEndWord
			}
		}
	}
	return line
}

function getQuoteSeparatedWords(line) {
	var quoteSymbols = ['"', '\'']
	var searchIndexes = [-1,-1]
	var start = 0
	var quoteSeparatedWords = []
	for (whileIndex = 0; whileIndex < 9876543; whileIndex++) {
		for (quoteIndex = quoteSymbols.length -1; quoteIndex > -1; quoteIndex--) {
			searchIndex = line.indexOf(quoteSymbols[quoteIndex], start)
			if (searchIndex < 0) {
				searchIndexes.splice(quoteIndex, 1)
				quoteSymbols.splice(quoteIndex, 1)
			}
			else {
				searchIndexes[quoteIndex] = searchIndex
			}
		}
		if (quoteSymbols.length == 0) {
			addSliceToWords(line.slice(start), quoteSeparatedWords)
			return quoteSeparatedWords
		}
		firstIndex = searchIndexes[0]
		quoteSymbol = quoteSymbols[0]
		if (searchIndexes[1] < firstIndex) {
			firstIndex = searchIndexes[1]
			quoteSymbol = quoteSymbols[1]
		}
		end = line.indexOf(quoteSymbol, firstIndex + 1)
		if (end < 0) {
			addSliceToWords(line.slice(start), quoteSeparatedWords)
			return quoteSeparatedWords
		}
		addSliceToWords(line.slice(start, firstIndex), quoteSeparatedWords)
		start = end + 1
		quoteSeparatedWords.push(line.slice(firstIndex + 1, end))
	}
}

function getSplicedString(originalString, spliceIndex, spliceRemoved, spliceReplacement) {//should be moved to parseWord
	return originalString.slice(0, spliceIndex) + spliceReplacement + originalString.slice(spliceIndex + spliceRemoved)
}

function lengthCheck(word) {
	return word.length > 0
}