//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gIDJoinWord = '_'

function addClosingStatement(parent) {
	var closingStatement = getStatement('</' + parent.tag + '>')
	closingStatement.openingStatement = parent
	closingStatement.parent = parent
	parent.children.push(closingStatement)
}

function addToDescendantsInsideFirst(descendants, statement) {
	if (descendants.length >= gLengthLimit) {
		var warningText = 'Recursion limit of 9876543 of\naddToDescendantsInsideFirst reached, no further descendants will be added.'
		var warningVariables = [gLengthLimit, statement].concat(descendants.slice(0, 10))
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
	if (descendants.length >= gLengthLimit) {
		var warningText = 'Recursion limit of 9876543 of\naddToDescendants reached, no further descendants will be added.'
		var warningVariables = [gLengthLimit, statement].concat(descendants.slice(0, 10))
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

function createDefault(registry, rootStatement) {
	rootStatement.variableMap = new Map(gVariableMapEntries)
	if (registry.idMap.has('_default')) {
		return
	}
	var defaultStatement = getStatement('default')
	rootStatement.children.splice(0, 0, defaultStatement)
	defaultStatement.parent = rootStatement
	defaultStatement.attributeMap.set('id', '_default')
	registry.idMap.set('_default', defaultStatement)
}

function getConcatenatedUniqueID(id, registry, statement) {
	for (var whileIndex = 1; whileIndex < gLengthLimit; whileIndex++) {
		var check = id + gIDJoinWord + whileIndex.toString()
		if (getIsIDUnique(check, registry, statement)) {
			return check
		}
	}
	return id
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
					if (lastParent.parent != null) {
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
	for (var remainingIndex = 0; remainingIndex < gLengthLimit; remainingIndex++) {
		addClosingStatement(lastParent)
		if (lastParent.parent == null) {
			return lastParent
		}
		lastParent = lastParent.parent
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

function getIsIDUnique(id, registry, statement) {
	if (registry.idMap.has(id)) {
		return false
	}
	statement.attributeMap.set('id', id)
	registry.idMap.set(id, statement)
	return true
}

function getLineByStatement(passthrough, statement) {
	if (statement.tag == null) {
		if (statement.nestingIncrement == -1) {
			if (statement.openingStatement == null) {
				return '</g>'
			}
			else {
				if (statement.openingStatement.tag == passthrough) {
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
	if (line.endsWith('>') || line.endsWith('{')) {
		line = line.slice(0, -1) + ' ' + line[line.length - 1]
	}
	var quoteSeparatedWords = getQuoteSeparatedWords(line)
	var lastIndex = quoteSeparatedWords.length - 1
	var tag = null
	if (quoteSeparatedWords.length > 0) {
		firstWord = quoteSeparatedWords[0]
		if (firstWord.startsWith('</') || firstWord == '}') {
			nestingIncrement = -1
		}
		else {
			if (firstWord.startsWith('<')) {
				firstWord = firstWord.slice(1)
			}
			if (firstWord.length > 0) {
				tag = getCapitalizedKey(firstWord)
			}
			if (quoteSeparatedWords.length > 1) {
				var lastWord = quoteSeparatedWords[lastIndex]
				if (lastWord == '>' || lastWord == '{') {
					nestingIncrement = 1
				}
				if (lastWord.endsWith('>') || lastWord == '{') {
					lastIndex -= 1
				}
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

function getStatementByException(exceptionSet, id, line, registry, rootStatement) {
	var statement = getStatementByParent(id, line, registry, rootStatement)
	exceptionSet.add('id')
	copyKeysExcept(exceptionSet, rootStatement.attributeMap, statement.attributeMap)
	return statement
}

function getStatementByParent(id, line, registry, parent) {
	var statement = getStatement(line)
	statement.parent = parent
	getUniqueID(id, registry, statement)
	parent.children.splice(-1, 0, statement)
	return statement
}

function getStatementID(registry, statement) {
	if (statement.attributeMap.has('id')) {
		var id = statement.attributeMap.get('id')
		registry.idMap.set(id, statement)
		return id
	}
	var id = statement.tag
	if (getIsIDUnique(id, registry, statement)) {
		return id
	}
	if (statement.attributeMap.has('work')) {
		id += gIDJoinWord + statement.attributeMap.get('work')
	}
	else {
		var parentMap = statement.parent.attributeMap
		if (parentMap.has('id')) {
			id += gIDJoinWord + parentMap.get('id')
		}
	}
	if (getIsIDUnique(id, registry, statement)) {
		return id
	}
	if (statement.attributeMap.has('points')) {
		var pointStrings = statement.attributeMap.get('points').replace(/,/g, ' ').split(' ').filter(lengthCheck).slice(2, 4)
		id += gIDJoinWord + pointStrings.join(gIDJoinWord)
		if (getIsIDUnique(id, registry, statement)) {
			return id
		}
	}
	var keys = 'cx cy x y r'.split(' ')
	for (var key of keys) {
		if (statement.attributeMap.has(key)) {
			id += gIDJoinWord + key + statement.attributeMap.get(key)
			if (getIsIDUnique(id, registry, statement)) {
				return id
			}
		}
	}
	return getConcatenatedUniqueID(id, registry, statement)
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

function getUniqueID(id, registry, statement) {
	if (getIsIDUnique(id, registry, statement)) {
		return id
	}
	for (var whileIndex = 1; whileIndex < gLengthLimit; whileIndex++) {
		var check = id + gIDJoinWord + whileIndex.toString()
		if (getIsIDUnique(check, registry, statement)) {
			return check
		}
	}
	return id
}

function getValueByKeyDefault(defaultValue, key, registry, statement, tag) {
	if (statement.attributeMap.has(key)) {
		value = statement.attributeMap.get(key)
		if (value.length > 0) {
			return value
		}
	}
	var defaultKey = tag + '.' + key
	var defaultStatement = registry.idMap.get('_default')
	var attributeMap = defaultStatement.attributeMap
	if (attributeMap.has(defaultKey)) {
		return attributeMap.get(defaultKey)
	}
	var defaultString = defaultValue.toString()
	attributeMap.set(defaultKey, defaultString)
	return defaultString
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

function initializeProcessors(processors) {
	for (var processor of processors) {
		processor.initialize()
		addToCapitalizationMap(processor.name)
	}
}

function processDescendants(registry, rootStatement, tagMap) {
	var descendants = [rootStatement]
	addToDescendantsInsideFirst(descendants, rootStatement)
	for (var statement of descendants) {
		processStatementByTagMap(registry, statement, tagMap)
	}
}

function processDescendantsByTagMap(registry, rootStatement, tagMap) {
	var descendants = [rootStatement]
	addToDescendantsInsideFirst(descendants, rootStatement)
	for (var statement of descendants) {
		processStatementByTagMap(registry, statement, tagMap)
	}
}

function processStatementByTagMap(registry, statement, tagMap) {
	if (tagMap.has(statement.tag)) {
		tagMap.get(statement.tag).processStatement(registry, statement)
	}
}

function widenPolygonBoundingBox(boundingBox, caller, registry, statement) {
	var points = getPointsByKey('points', registry, statement)
	if (points == null) {
		return boundingBox
	}
	var transformedMatrix = getTransformed2DMatrix(caller, registry, statement)
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

function widenStatementBoundingBox(boundingBox, caller, registry, statement) {
	if (statement.tag == 'polygon' || statement.tag == 'polyline') {
		return widenPolygonBoundingBox(boundingBox, caller, registry, statement)
	}
	return boundingBox
}
