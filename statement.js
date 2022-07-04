//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gIDJoinWord = '_'

function addClosingStatement(parent) {
	var closingStatement = getStatement('</' + parent.tag + '>')
	closingStatement.parent = parent
	parent.children.push(closingStatement)
}

function addClosingStatementConvertToGroup(parent) {
	addClosingStatement(parent)
	parent.tag = 'g'
	parent.nestingIncrement = 1
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

function deleteStatement(statement) {
	var id = statement.attributeMap.get('id')
	var siblings = statement.parent.children
	for (var siblingIndex = 0; siblingIndex < siblings.length; siblingIndex++) {
		var attributeMap = siblings[siblingIndex].attributeMap
		if (attributeMap.has('id')) {
			if (attributeMap.get('id') == id) {
				siblings.splice(siblingIndex, 1)
				return
			}
		}
	}
}

function deleteStatementsByTagDepth(depth, registry, statement, tag) {
	var children = statement.children
	if (children == null) {
		return
	}
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 100 in deleteStatementsByTagDepth reached, no further statements will be deleted.'
		var warningVariables = [gRecursionLimit, statement]
		warning(warningText, warningVariables)
		return
	}
	depth += 1
	for (var childIndex = children.length - 1; childIndex > -1; childIndex--) {
		var child = children[childIndex]
		deleteStatementsByTagDepth(depth, registry, child, tag)
		if (child.tag == tag) {
			children.splice(childIndex, 1)
		}
	}
	if (children.length == 1 && depth > 1) {
		if (children[0].nestingIncrement == -1) {
			deleteStatement(statement)
		}
	}
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
			var addChild = statement.tag != null
			statement.parent = lastParent
			if (statement.nestingIncrement == 1) {
				lastParent = statement
			}
			else {
				if (statement.nestingIncrement == -1) {
					if (lastParent.parent != null) {
						lastParent = lastParent.parent
						addChild = true
					}
				}
			}
			if (addChild) {
				statement.parent.children.push(statement)
			}
		}
	}
	if (lastParent == null) {
		return null
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
	var firstWord = statement.tag
	if (firstWord == null) {
		if (statement.nestingIncrement == -1) {
			if (statement.parent == null) {
				return '</g>'
			}
			else {
				if (statement.parent.tag == passthrough) {
					return '</' + passthrough + '>'
				}
				return '</g>'
			}
		}
		else {
			return ''
		}
	}
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
		var attributeLine = entry[0] + '=' + quoteString + value + quoteString
		if (firstWord == 'text') {
			if (entry[0] != 'innerHTML') {
				attributeWords.push(attributeLine)
			}
		}
		else {
			attributeWords.push(attributeLine)
		}
	}
	var attributeLine = attributeWords.join(' ')
	var lineClosing = '>'
	if (statement.nestingIncrement == 0) {
		lineClosing = '/>'
	}
	if (firstWord == 'text' && statement.attributeMap.has('innerHTML')) {
		return attributeLine +  '>' + statement.attributeMap.get('innerHTML') + '</text>'
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

function getQuoteSeparatedSnippets(line) {
	var quoteCharacter = null
	var quoteSeparatedSnippets = []
	var start = 0
	for (var characterIndex = 0; characterIndex < line.length; characterIndex++) {
		var character = line[characterIndex]
		if (quoteCharacter == null) {
			if (gSpaceEqualSet.has(character)) {
				var quoteSeparatedWord = line.slice(start, characterIndex)
				if (quoteSeparatedWord.length > 0) {
					quoteSeparatedSnippets.push(getUnquotedText(quoteSeparatedWord))
				}
				if (character == '=') {
					quoteSeparatedSnippets.push(character)
				}
				start = characterIndex + 1
			}
			else {
				if (gQuoteSet.has(character)) {
					quoteCharacter = character
				}
			}
		}
		else {
			if (character == quoteCharacter) {
				quoteCharacter = null
			}
		}
	}
	quoteSeparatedSnippets.push(getUnquotedText(line.slice(start)))
	return quoteSeparatedSnippets
}

function getStatement(line) {
	var nestingIncrement = 0
	if (line.indexOf('=') != -1) {
		line = getLineWithEndspace(['/>', '>', '[', '{'], line)
	}
	var quoteSeparatedSnippets = getQuoteSeparatedSnippets(line)
	var lastIndex = quoteSeparatedSnippets.length - 1
	var tag = null
	if (quoteSeparatedSnippets.length > 0) {
		firstWord = quoteSeparatedSnippets[0]
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
			if (quoteSeparatedSnippets.length > 1) {
				var lastWord = quoteSeparatedSnippets[lastIndex]
				if (lastWord == '>' || lastWord == '{') {
					nestingIncrement = 1
				}
				if (lastWord.endsWith('>') || lastWord == '{') {
					lastIndex -= 1
				}
			}
		}
	}
	var attributes = getAttributes(quoteSeparatedSnippets.slice(1, lastIndex + 1))
	if (tag == 'text') {
		if (attributes.length > 0) {
			var lastAttribute = attributes[attributes.length - 1]
			var lastAttributeWord = lastAttribute[1]
			var lessThanIndex = lastAttributeWord.indexOf('<')
			var greaterThanIndex = lastAttributeWord.indexOf('>')
			if (lessThanIndex != -1 && greaterThanIndex != -1) {
				lastAttribute[1] = lastAttributeWord.slice(0, greaterThanIndex).trim()
				if (greaterThanIndex < lessThanIndex) {
					attributes.push(['innerHTML', lastAttributeWord.slice(greaterThanIndex + 1, lessThanIndex)])
				}
			}
		}
		else {
			for (var snippetIndex = quoteSeparatedSnippets.length - 1; snippetIndex > 0; snippetIndex--) {
				var snippet = quoteSeparatedSnippets[snippetIndex]
				if (snippet.startsWith('>')) {
					var text = quoteSeparatedSnippets.slice(snippetIndex).join(' ')
					var lessThanIndex = text.indexOf('<')
					if (lessThanIndex != -1) {
						attributes.push(['innerHTML', text.slice(1, lessThanIndex)])
					}
					break
				}
			}
		}
		nestingIncrement = 0
	}
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
	return getStatementByParentTag(new Map(attributes), nestingIncrement, null, tag)
}

function getStatementByParentTag(attributeMap, nestingIncrement, parent, tag) {
	var children = null
	if (tag != null) {
		children = []
	}
	return {attributeMap:attributeMap, children:children, nestingIncrement:nestingIncrement, parent:parent, tag:tag, variableMap:null}
}

function getStatementID(registry, statement) {
	var id = statement.tag
	if (statement.attributeMap.has('id')) {
		id = statement.attributeMap.get('id')
		if (registry.idMap.has(id)) {
			id = statement.tag + gIDJoinWord + id
		}
		else {
			registry.idMap.set(id, statement)
			return id
		}
	}
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
	var attributeMap = statement.attributeMap
	var value = getValueByKeyTag(attributeMap, key, tag)
	if (value != null) {
		return value
	}
	if (attributeMap.has(key)) {
		value = attributeMap.get(key)
		if (value.length > 0) {
			return value
		}
	}
	var defaultMap = registry.idMap.get('_default').attributeMap
	var value = getValueByKeyTag(defaultMap, key, tag)
	if (value != null) {
		return value
	}
	var defaultString = defaultValue.toString()
	var keyValueString = key + ':' + defaultString
	if (defaultMap.has(tag)) {
		defaultMap.set(tag, defaultMap.get(tag) + ';' + keyValueString)
	}
	else {
		defaultMap.set(tag, keyValueString)
	}
	return defaultString
}

function getValueByKeyTag(attributeMap, key, tag) {
	if (attributeMap.has(tag)) {
		var keyValueStrings = attributeMap.get(tag).split(';')
		for (var keyValueString of keyValueStrings) {
			var keyValue = keyValueString.split(':')
			if (keyValue[0].trim() == key) {
				var value = keyValue[1].trim()
				if (value.length > 0) {
					return value
				}
				return null
			}
		}
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

function getWorkStatements(registry, statement) {
	var attributeMap = statement.attributeMap
	if (!attributeMap.has('work')) {
		return null
	}
	var workIDs = attributeMap.get('work').replace(/,/g, ' ').split(' ').filter(lengthCheck)
	var workStatements = []
	for (var workID of workIDs) {
		workID = workID.trim()
		if (registry.idMap.has(workID)) {
			workStatements.push(registry.idMap.get(workID))
		}
	}
	return workStatements
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
	var points = getPointsHD(registry, statement)
	if (points == null) {
		return boundingBox
	}
	var transformedMatrix = getTransformed2DMatrix(caller, registry, statement)
	if (transformedMatrix != null) {
		transform2DPoints(points, transformedMatrix)
	}
	for (var point of points) {
		if (boundingBox == null) {
			boundingBox = [point.slice(0, 2), point.slice(0, 2)]
		}
		else {
			widenBoundingBox(boundingBox, point)
		}
	}
	return boundingBox
}

function widenStatementBoundingBox(boundingBox, caller, registry, statement) {
	if (statement.tag == 'group' || statement.tag == 'g') {
		get2DMatrix(registry, statement)
	}
	if (statement.tag == 'polygon' || statement.tag == 'polyline') {
		return widenPolygonBoundingBox(boundingBox, caller, registry, statement)
	}
	return boundingBox
}
