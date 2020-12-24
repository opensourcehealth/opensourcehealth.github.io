//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gCapitalizationMap = new Map()

function addSliceToWords(lineSlice, quoteSeparatedWords) {
	if (lineSlice.indexOf('=') != -1) {
		lineSlice = getLineWithEndspace(['/>', '>', '[', '{'], lineSlice)
	}
	snippets = lineSlice.replace(/=/g, ' = ').split(' ').filter(lengthCheck)
	pushArray(quoteSeparatedWords, snippets)
}

function addToCapitalizationMap(capitalizedWordString) {
	capitalizedWords = capitalizedWordString.split(' ').filter(lengthCheck)
	for (var capitalizedWord of capitalizedWords) {
		wordLower = capitalizedWord.toLowerCase()
		if (capitalizedWord != wordLower) {
			gCapitalizationMap.set(wordLower, capitalizedWord)
		}
	}
}

function getAttributes(tokens) {
	var attributes = []
	var key = null
	var values = []
	for (var token of tokens) {
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

function getCapitalizedKey(key) {
	if (gCapitalizationMap.has(key.toLowerCase())) {
		return gCapitalizationMap.get(key.toLowerCase())
	}
	return key
}

function getEndOfLine(text) {
	if (text.indexOf('\r\n') > -1) {
		return '\r\n'
	}
	return '\n'
}

function getIsIDUnique(id, registry, statement) {
	if (registry.idMap.has(id)) {
		return false
	}
	statement.attributeMap.set('id', id)
	return true
}

function getJoinWord() {
	if (navigator.appVersion.indexOf("Win") > -1) {
		return '\r\n'
	}
	return '\n'
}

function getKeyStatement(key, statement) {
	if (statement.attributeMap.has(key)) {
		return [key, statement]
	}
	key = statement.tag + '.' + key
	statement = statement.parent
	for (whileIndex = 0; whileIndex < 987654; whileIndex++) {
		if (statement == null) {
			break
		}
		else {
			if (statement.attributeMap.has(key)) {
				return [key, statement]
			}
			statement = statement.parent
		}
	}
	return null
}

function getLineWithEndspace(endWords, line) {
	for (var endWord of endWords) {
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
	for (whileIndex = 0; whileIndex < 987654; whileIndex++) {
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

function getStatementID(registry, statement) {
	if (statement.attributeMap.has('id')) {
		return statement.attributeMap.get('id')
	}
	const idJoinWord = '_'
	var statementID = statement.tag
	if (getIsIDUnique(statementID, registry, statement)) {
		return statementID
	}
	if (statement.attributeMap.has('work')) {
		statementID += idJoinWord + statement.attributeMap.get('work')
	}
	else {
		var parentMap = statement.parent.attributeMap
		if (parentMap.has('id')) {
			statementID += idJoinWord + parentMap.get('id')
		}
	}
	if (getIsIDUnique(statementID, registry, statement)) {
		return statementID
	}
	if (statement.attributeMap.has('points')) {
		var pointStrings = statement.attributeMap.get('points').replace(/,/g, ' ').split(' ').filter(lengthCheck).slice(2, 4)
		statementID += idJoinWord + pointStrings.join(idJoinWord)
		if (getIsIDUnique(statementID, registry, statement)) {
			return statementID
		}
	}
	var keys = 'cx cy x y r'.split(' ')
	for (var key of keys) {
		if (statement.attributeMap.has(key)) {
			statementID += idJoinWord + key + statement.attributeMap.get(key)
			if (getIsIDUnique(statementID, registry, statement)) {
				return statementID
			}
		}
	}
	for (whileIndex = 1; whileIndex < 987654; whileIndex++) {
		var check = statementID + idJoinWord + whileIndex.toString()
		if (getIsIDUnique(check, registry, statement)) {
			return check
		}
	}
	return statementID
}

function lengthCheck(word) {
	return word.length > 0
}
