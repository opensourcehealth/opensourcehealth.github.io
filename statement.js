//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addToDescendantsInsideFirst(descendants, statement) {
	var lengthLimit = 98765432
	if (descendants.length >= lengthLimit) {
		var warningText = 'Recursion limit of 98765432 of\naddToDescendantsInsideFirst reached, no further descendants will be added.'
		var warningVariables = [lengthLimit, statement].concat(descendants.slice(0, 10))
		warning(warningText, warningVariables)
		return
	}
	if (statement.children != null) {
		for (var child of statement.children) {
			addToDescendantsInsideFirst(descendants, child)
			descendants.push(child)
		}
	}
}

function addToDescendantsOutsideFirst(descendants, statement) {
	var lengthLimit = 98765432
	if (descendants.length >= lengthLimit) {
		var warningText = 'Recursion limit of 98765432 of\naddToDescendants reached, no further descendants will be added.'
		var warningVariables = [lengthLimit, statement].concat(descendants.slice(0, 10))
		warning(warningText, warningVariables)
		return
	}
	if (statement.children != null) {
		for (var child of statement.children) {
			descendants.push(child)
			addToDescendantsOutsideFirst(descendants, child)
		}
	}
}

function createDefault(documentRoot, registry) {
	if (registry.idMap.has('_default')) {
		return
	}
	var defaultStatement = getStatement('default')
	documentRoot.children.splice(0, 0, defaultStatement)
	defaultStatement.parent = documentRoot
	defaultStatement.attributeMap.set('id', '_default')
	registry.idMap.set('_default', defaultStatement)
}

function getDocumentRoot(lines, tag) {
	var lastParent = null
	for (lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		var statement = getStatement(lines[lineIndex])
		if (lastParent == null) {
			if (statement.tag != null) {
				if (statement.tag != tag || statement.nestingIncrement != 1) {
					statement.parent = getStatement(tag + ' {')
					statement.parent.children.push(statement)
				}
				lastParent = statement
				if (statement.nestingIncrement != 1) {
					lastParent = statement.parent
				}
			}
		}
		else {
			statement.parent = lastParent
			if (statement.nestingIncrement == 1) {
				lastParent = statement
			}
			else {
				if (statement.nestingIncrement == -1) {
					if (lastParent.parent == null) {
						warning('Warning, text has too many closing brackets, at lineIndex:', [lineIndex, lastParent, statement])
					}
					else {
						lastParent = lastParent.parent
						statement.openingStatement = statement.parent
					}
				}
			}
			if (statement.tag != null || statement.openingStatement != null) {
				statement.parent.children.push(statement)
			}
		}
	}
	for (var remainingIndex = 0; remainingIndex < 987654; remainingIndex++) {
		if (lastParent.parent == null) {
			return lastParent
		}
		lastParent = lastParent.parent
		var closingStatement = getStatement('</' + lastParent.tag + '>')
		closingStatement.openingStatement = lastParent
		lastParent.children.push(closingStatement)
	}
	return null
}

function getIDReplacedBySuffix(bracketString, increment, replacementMap, searchSuffix) {
	searchSuffix = '.' + searchSuffix
	var replacedTokens = []
	var tokens = getTokens('-', [bracketString])
	tokens = getTokens('+', tokens)
	for (var token of tokens) {
		indexOfSearchSuffix = token.indexOf(searchSuffix)
		if (indexOfSearchSuffix != -1) {
			beforeSuffix = token.slice(0, indexOfSearchSuffix).trim()
			if (replacementMap.has(beforeSuffix)) {
				value = parseFloat(replacementMap.get(beforeSuffix)) + increment
				replacedTokens.push(value)
			}
			else {
				warningText = 'Error in getIDReplacedBySuffix, could not find id:\nin search string:'
				warningVariables = [beforeSuffix, bracketString]
				warning(warningText, warningVariables)
			}
		}
		else {
			replacedTokens.push(token)
		}
	}
	return replacedTokens.join('')
}

function getIDReplaced(bracketString, increment, replacementMap, searchSuffix) {
	if (bracketString.indexOf(']') == -1) {
		return getIDReplacedBySuffix(bracketString, increment, replacementMap, searchSuffix)
	}
	var splitBracketStrings = bracketString.split(']')
	var replacedStrings = []
	for (var splitBracketString of splitBracketStrings) {
		if (splitBracketString.length > 1) {
			var tokens = splitBracketString.split('[')
			if (tokens[0].length > 0) {
				replacedStrings.push(tokens[0])
			}
			var lastToken = tokens[tokens.length - 1].replace(/ /g, '')
			if (replacementMap.has(lastToken)) {
				value = parseFloat(replacementMap.get(lastToken)) + increment
				replacedStrings.push(value)
			}
			else {
				warningText = 'Error in getIDReplaced, could not find id:\nin search string:'
				warningVariables = [lastToken, bracketString]
				warning(warningText, warningVariables)
			}
		}
	}
	return replacedStrings.join('')
}

function getIsIDUnique(id, registry, statement) {
	if (registry.idMap.has(id)) {
		return false
	}
	statement.attributeMap.set('id', id)
	return true
}

function getLineByStatement(passthrough, statement) {
	if (statement.tag == null) {
		if (statement.nestingIncrement == -1) {
			if (statement.openingStatement == null) {
				return '</g>'
			}
			else {
				if (statement.tag == passthrough) {
					return '</' + passthrough + '>'
				}
				return '</g>'
			}
		}
		else {
			return ''
		}
	}
	var firstWord = statement.tag
	if (firstWord != passthrough && statement.nestingIncrement == 1) {
		firstWord = 'g'
	}
	var attributeWords = ['<' + firstWord]
	for (var entry of statement.attributeMap) {
		var value = entry[1]
		var quoteString = '"'
		if (value.indexOf('"') != -1) {
			quoteString = '\''
		}
		attributeWords.push(entry[0] + '=' + quoteString + value + quoteString)
	}
	var attributeLine = attributeWords.join(' ')
	var lineClosing = '>'
	if (statement.nestingIncrement == 0) {
		lineClosing = '/>'
	}
	if (attributeLine.endsWith('"') || attributeLine.endsWith('\'')) {
		return attributeLine + lineClosing
	}
	return attributeLine + ' ' + lineClosing
}

function getPassthroughLines(descendants, passthrough) {
	var nesting = 0
	var passthroughLines = []
	for (var statement of descendants) {
		var passthroughLine = getLineByStatement(passthrough, statement)
		var indentationEnd = nesting - (statement.nestingIncrement < 0)
		for (var indentationIndex = 1; indentationIndex < indentationEnd; indentationIndex++) {
			passthroughLine = '  ' + passthroughLine
		}
		passthroughLines.push(passthroughLine)
		nesting += statement.nestingIncrement
	}
	return passthroughLines
}

function getStatement(line) {
	var children = null
	var nestingIncrement = 0
	var quoteSeparatedWords = getQuoteSeparatedWords(line)
	var lastIndex = quoteSeparatedWords.length - 1
	var tag = null
	if (quoteSeparatedWords.length > 0) {
		firstWord = quoteSeparatedWords[0]
		if (firstWord.startsWith('</') || firstWord == ']' || firstWord == '}') {
			nestingIncrement = -1
		}
		else {
			if (firstWord.startsWith('<')) {
				firstWord = firstWord.slice(1)
			}
			if (firstWord.length > 0) {
				tag = getCapitalizedKey(firstWord)
			}
		}
		if (quoteSeparatedWords.length > 1) {
			var lastWord = quoteSeparatedWords[lastIndex]
			if (lastWord == '>' || lastWord == '[' || lastWord == '{') {
				nestingIncrement = 1
			}
			if (lastWord.endsWith('>') || lastWord == '[' || lastWord == '{') {
				lastIndex -= 1
			}
		}
	}
	if (tag != null) {
		children = []
	}
	var attributes = getAttributes(quoteSeparatedWords.slice(1, lastIndex + 1))
	for (var attribute of attributes) {
		keyStrings = attribute[0].split('.')
		if (keyStrings.length == 1) {
			attribute[0] = getCapitalizedKey(attribute[0])
		}
		else {
			if (keyStrings.length == 2) {
				keyStrings[0] = getCapitalizedKey(keyStrings[0])
				keyStrings[1] = getCapitalizedKey(keyStrings[1])
				attribute[0] = keyStrings.join('.')
			}
		}
	}
	var attributeMap = new Map(attributes)
	var statement = {
	attributeMap:attributeMap,
	children:children,
	nestingIncrement:nestingIncrement,
	openingStatement:null,
	parent:null,
	tag:tag,
	variableMap:new Map()}
	return statement
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

function getTokens(delimeter, searchStrings) {
	tokens = []
	for (var searchString of searchStrings) {
		subTokens = searchString.split(delimeter)
		for (subTokenIndex = 0; subTokenIndex < subTokens.length; subTokenIndex++) {
			tokens.push(subTokens[subTokenIndex])
			if (subTokenIndex < subTokens.length - 1) {
				tokens.push(delimeter)
			}
		}
	}
	return tokens
}

function getNextMonadForArithmeticOperator(character, monad) {
	var nextMonad = getValueMonad(character)
	if (nextMonad == null) {
		return monad
	}
	nextMonad.previousMonad = monad
	nextMonad.processCharacter(character)
	return nextMonad
}

function getResultUpdatePrevious(originalMonad) {
	var monad = originalMonad
	var value = originalMonad.getValue()
	for (var whileIndex = 0; whileIndex < 9876543; whileIndex++) {
		if (monad.previousMonad == null) {
			originalMonad.previousMonad = monad.previousMonad
			originalMonad.value = value
			return value
		}
		if (monad.previousMonad.precedenceLevel == 1) {
			originalMonad.previousMonad = monad.previousMonad
			originalMonad.value = value
			return value
		}
		console.log('value')
		console.log(value)
		value = monad.previousMonad.getResult(value)
		console.log(value)
		console.log(monad.previousMonad)
		monad = monad.previousMonad.previousMonad
	}
	return null
}

function getValueByEquation(defaultValue, equationString, key, registry, statement, tag) {
	var monad = new StartMonad()
	for (var character of equationString) {
		monad = monad.getNextMonad(character)
		console.log(monad)
	}
	console.log(monad)
	return getResultUpdatePrevious(monad)
}

function getValueMonad(character) {
	if (gValueMonadMap.has(character)) {
		return new (gValueMonadMap.get(character))()
	}
	return null
}

function getWorkStatement(registry, statement) {
	var attributeMap = statement.attributeMap
	if (!attributeMap.has('work')) {
		return null
	}
	var workID = attributeMap.get('work')
	if (!registry.idMap.has(workID)) {
		return null
	}
	return registry.idMap.get(workID)
}

gOperatorMonadMap = new Map([['+', AdditionMonad], [')', BracketCloseMonad], ['*', MultiplicationMonad], ['-', SubtractionMonad]])
gValueMonadMap = new Map([['(', BracketOpenMonad]])
addValueToMapByKeys(['-', '.', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], gValueMonadMap, NumberMonad)

function processCharacterForAdditionSubtraction(character, monad) {
	if (monad.previousMonad.previousMonad == null) {
		return
	}
	console.log('monad.previousMonad.previousMonad.precedenceLevel')
	console.log(monad.previousMonad.previousMonad.precedenceLevel)
	if (monad.previousMonad.previousMonad.precedenceLevel < monad.precedenceLevel) {
		getResultUpdatePrevious(monad.previousMonad)
	}
}

function AdditionMonad() {
	this.getNextMonad = function(character) {
		return getNextMonadForArithmeticOperator(character, this)
	}
	this.getResult = function(value) {
		return this.previousMonad.getValue() + value
	}
	this.precedenceLevel = 4
	this.previousMonad = null
	this.processCharacter = function(character) {
		processCharacterForAdditionSubtraction(character, this)
	}
}

function BracketCloseMonad() {
	this.getNextMonad = function(character) {
		if (gOperatorMonadMap.has(character)) {
			var nextMonad = new (gOperatorMonadMap.get(character))()
			nextMonad.previousMonad = this
			nextMonad.processCharacter(character)
			return nextMonad
		}
		return this
	}
	this.getValue = function() {
		return this.value
	}
	this.precedenceLevel = 1
	this.previousMonad = null
	this.processCharacter = function(character) {
		console.log('this.previousMonad')
		console.log(this.previousMonad)
		this.value = getResultUpdatePrevious(this.previousMonad)
		this.previousMonad = this.previousMonad.previousMonad.previousMonad
		console.log(this.previousMonad)
		console.log(this.value)
	}
	this.value = null
}

function BracketOpenMonad() {
	this.getNextMonad = function(character) {
		return getNextMonadForArithmeticOperator(character, this)
	}
	this.getResult = function(value) {
		return null
	}
	this.precedenceLevel = 1
	this.previousMonad = null
	this.processCharacter = function(character) {
	}
}

function MultiplicationMonad() {
	this.getNextMonad = function(character) {
		return getNextMonadForArithmeticOperator(character, this)
	}
	this.getResult = function(value) {
		return this.previousMonad.getValue() * value
	}
	this.precedenceLevel = 3
	this.previousMonad = null
	this.processCharacter = function(character) {
	}
}

function NumberMonad() {
	this.getNextMonad = function(character) {
		if (gOperatorMonadMap.has(character)) {
			var nextMonad = new (gOperatorMonadMap.get(character))()
			nextMonad.previousMonad = this
			nextMonad.processCharacter(character)
			return nextMonad
		}
		this.processCharacter(character)
		return this
	}
	this.getValue = function() {
		if (this.value == null) {
			this.value = parseFloat(this.valueString)
		}
		return this.value
	}
	this.precedenceLevel = null
	this.previousMonad = null
	this.processCharacter = function(character) {
		this.valueString += character
	}
	this.value = null
	this.valueString = ''
}

function StartMonad() {
	this.getNextMonad = function(character) {
		var nextMonad = getValueMonad(character)
		if (nextMonad == null) {
			return this
		}
		nextMonad.processCharacter(character)
		return nextMonad
	}
}

function SubtractionMonad() {
	this.getNextMonad = function(character) {
		return getNextMonadForArithmeticOperator(character, this)
	}
	this.getResult = function(value) {
		return this.previousMonad.getValue() - value
	}
	this.precedenceLevel = 4
	this.previousMonad = null
	this.processCharacter = function(character) {
		processCharacterForAdditionSubtraction(character, this)
	}
}

function getValueByKeyDefault(defaultValue, key, registry, statement, tag) {
	if (statement.attributeMap.has(key)) {
		value = statement.attributeMap.get(key)
		if (value.length > 0) {
			return statement.attributeMap.get(key)
		}
	}
	var defaultKey = statement.tag + '.' + key
	var defaultStatement = registry.idMap.get('_default')
	var attributeMap = defaultStatement.attributeMap
	if (attributeMap.has(defaultKey)) {
		return attributeMap.get(defaultKey)
	}
	var defaultString = defaultValue.toString()
	attributeMap.set(defaultKey, defaultString)
	return defaultString
}

function processDescendants(registry, rootStatement, tagMap) {
	var descendants = [rootStatement]
	addToDescendantsInsideFirst(descendants, rootStatement)
	for (var statement of descendants) {
		if (tagMap.has(statement.tag)) {
			tagMap.get(statement.tag)(registry, statement)
		}
	}
}

function processDescendantsByTagMap(registry, rootStatement, tagMap) {
	var descendants = [rootStatement]
	addToDescendantsInsideFirst(descendants, rootStatement)
	for (var statement of descendants) {
		if (tagMap.has(statement.tag)) {
			tagMap.get(statement.tag).processStatement(registry, statement)
		}
	}
}

function setProcessorMap(processors, tagMap) {
	for (var processor of processors) {
		tagMap.set(processor.name, processor)
		addToCapitalizationMap(processor.name)
		if (processor.optionMap != null) {
			if (processor.optionMap.has('capitalized')) {
				addToCapitalizationMapByPhrase(processor.optionMap.get('capitalized'))
			}
		}
	}
}

function widenPolygonBoundingBox(boundingBox, caller, statement) {
	var points = getPolygonPoints(statement)
	if (points == null) {
		return boundingBox
	}
	var transformedMatrix = getTransformed2DMatrix(caller, statement)
	for (var point of points) {
		transform2DPoint(point, transformedMatrix)
		if (boundingBox == null) {
			boundingBox = [point.slice(0), point.slice(0)]
		}
		else {
			widenBoundingBox(boundingBox, point)
		}
	}
	return boundingBox
}

function widenStatementBoundingBox(boundingBox, caller, statement) {
	if (statement.tag == 'polygon') {
		return widenPolygonBoundingBox(boundingBox, caller, statement)
	}
	return boundingBox
}
