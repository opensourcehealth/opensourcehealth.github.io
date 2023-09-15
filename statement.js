//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

gValidTagSet = new Set('default defs layer license radialGradient stop svg xml'.split(' '))

function addPassthroughLines(depth, passthrough, passthroughNesting, statement) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in addPassthroughLines reached, no further statements will be added.'
		warningByList([warningText, statement, gRecursionLimit])
		return
	}
	depth += 1
	passthroughNesting.lines.push('  '.repeat(Math.max(0, passthroughNesting.nesting - 1)) + getLineByStatement(statement))
	if (statement.nestingIncrement == 1) {
		passthroughNesting.nesting += 1
	}
	for (var child of statement.children) {
		addPassthroughLines(depth, passthrough, passthroughNesting, child)
	}
	if (statement.nestingIncrement == 1) {
		passthroughNesting.nesting -= 1
		var passthroughLine = '  '.repeat(Math.max(0, passthroughNesting.nesting - 1))
		if (statement.tag == passthrough) {
			passthroughLine += '</' + passthrough + '>'
		}
		else {
			passthroughLine += '</' + statement.tag + '>'
		}
		passthroughNesting.lines.push(passthroughLine)
	}
}

function addToDescendantsInsideFirst(descendants, statement) {
	if (descendants.length >= gLengthLimit) {
		var warningText = 'Recursion limit of 9876543 of\naddToDescendantsInsideFirst reached, no further descendants will be added.'
		var warningVariables = [gLengthLimit, statement].concat(descendants.slice(0, 10))
		warning(warningText, warningVariables)
		return
	}
	if (statement.children != undefined) {
		for (var child of statement.children) {
			if (gParentFirstSet.has(child.tag)) {
				descendants.push(child)
				addToDescendantsInsideFirst(descendants, child)
			}
			else {
				addToDescendantsInsideFirst(descendants, child)
				descendants.push(child)
			}
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
	if (statement.children != undefined) {
		for (var child of statement.children) {
			descendants.push(child)
			addToDescendantsOutsideFirst(descendants, child)
		}
	}
}

function convertToGroup(statement) {
	statement.tag = 'g'
	statement.nestingIncrement = 1
}

function convertToGroupIfParent(statement) {
	if (statement.nestingIncrement == 1) {
		statement.tag = 'g'
	}
}

function createDefault(registry, rootStatement) {
	rootStatement.variableMap = new Map()
	if (registry.idMap.has('_default')) {
		return
	}
	var defaultStatement = getStatementByParentTag(new Map([['id', '_default']]), 0, undefined, 'default')
	defaultStatement.parent = rootStatement
	rootStatement.children.splice(0, 0, defaultStatement)
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
	var whileCount = 2
	if (registry.idCountMap.has(id)) {
		whileCount = registry.idCountMap.get(id) + 1
	}
	for (; whileCount < gLengthLimit; whileCount++) {
		var check = id + '_' + whileCount.toString()
		if (getIsIDUnique(check, registry, statement)) {
			registry.idCountMap.set(id, whileCount)
			return check
		}
	}
	return id
}

function getDescendantsInsideFirst(statement) {
	var descendants = []
	addToDescendantsInsideFirst(descendants, statement)
	descendants.push(statement)
	return descendants
}

function getDocumentRoot(lines, tag) {
	var lastParent = undefined
	for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		var line = lines[lineIndex]
		var statement = getStatement(line)
		if (statement.nestingIncrement > -1) {
			statement.lineIndex = lineIndex
		}
		if (lastParent == undefined) {
			if (statement.tag != null) {
				if (statement.tag == tag) {
					statement.nestingIncrement = 1
				}
				else {
					statement.parent = getStatementByParentTag(new Map(), 1, undefined, tag)
					statement.parent.children.push(statement)
				}
				if (statement.nestingIncrement == 1) {
					lastParent = statement
				}
				else {
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
					if (lastParent.parent != undefined) {
						lastParent = lastParent.parent
					}
				}
			}
			if (statement.tag != null) {
				statement.parent.children.push(statement)
			}
		}
	}
	if (lastParent == null) {
		return undefined
	}
	for (var remainingIndex = 0; remainingIndex < gLengthLimit; remainingIndex++) {
		if (lastParent.parent == undefined) {
			return lastParent
		}
		lastParent = lastParent.parent
	}
	return undefined
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

function getStrings(key, statement) {
	var attributeMap = statement.attributeMap
	if (!attributeMap.has(key)) {
		return []
	}
	return attributeMap.get(key).replace(/,/g, ' ').split(' ').filter(lengthCheck)
}

function getIsIDUnique(id, registry, statement) {
	if (registry.idMap.has(id)) {
		return false
	}
	setIDMapSet(id, registry, statement)
	return true
}

function getLineByStatement(statement) {
	var firstWord = statement.tag
	if (firstWord == null) {
		return ''
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

function getPassthroughLinesByStatement(passthrough, statement) {
	var passthroughNesting = {lines:[], nesting:0}
	addPassthroughLines(0, passthrough, passthroughNesting, statement)
	return passthroughNesting.lines
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
	line = line.trim()
	if (line.startsWith('</') || line.startsWith('}')) {
		return getStatementByParentTag(undefined, -1, undefined, null)
	}
	if (line.length < 2) {
		return getStatementByParentTag(undefined, 0, undefined, null)
	}
	var lastCharacter = line[line.length - 1]
	var nestingIncrement = 0
	var sliceBegin = line[0] == '<'
	var sliceEnd = line.length
	if (lastCharacter == '>' || lastCharacter == '{') {
		if (line[line.length - 2] == '/') {
			sliceEnd -= 2
		}
		else {
			sliceEnd -= 1
			nestingIncrement = 1
		}
	}
	line = line.slice(sliceBegin, sliceEnd).trim()
	var tag = line
	var indexOfSpace = line.indexOf(' ')
	if (indexOfSpace != -1) {
		tag = tag.slice(0, indexOfSpace)
	}
	if (tag.length == 0) {
		return getStatementByParentTag(undefined, 0, undefined, null)
	}
	line = line.slice(indexOfSpace + 1).trim()
	var innerHTML = null
	if (tag == 'text') {
		var lastIndexOfGreaterThan = line.lastIndexOf('>')
		if (lastIndexOfGreaterThan != -1) {
			if (line.endsWith('<')) {
				innerHTML = line.slice(lastIndexOfGreaterThan + 1, -1)
			}
			else {
				innerHTML = line.slice(lastIndexOfGreaterThan + 1)
			}
			line = line.slice(0, lastIndexOfGreaterThan).trim()
		}
	}
	var quoteSeparatedSnippets = getQuoteSeparatedSnippets(line)
	var tag = getCapitalizedKey(tag)
	if (quoteSeparatedSnippets.length == 0) {
		return getStatementByParentTag(new Map(), nestingIncrement, undefined, tag)
	}
	var attributes = getAttributes(quoteSeparatedSnippets)
	if (innerHTML != null) {
		attributes.push(['innerHTML', innerHTML])
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
	return getStatementByParentTag(new Map(attributes), nestingIncrement, undefined, tag)
}

function getStatementByParentTag(attributeMap, nestingIncrement, parent, tag) {
	var statement =	{attributeMap:attributeMap, nestingIncrement:nestingIncrement, parent:parent, tag:tag}
	if (tag != null) {
		statement.children = []
	}

	if (parent != null) {
		parent.children.push(statement)
	}

	return statement
}

function getStatementID(registry, statement) {
	var attributeMap = statement.attributeMap
	var id = statement.tag
	if (attributeMap.has('id')) {
		id = attributeMap.get('id')
		if (registry.idMap.has(id)) {
			var previousStatement = registry.idMap.get(id)
			if (registry.generatedIDSet.has(id)) {
				previousStatement.attributeMap.delete('id')
				getStatementID(registry, previousStatement)
				registry.idMap.set(id, statement)
				return
			}
			noticeByList(['Duplicate ID in getStatementID in statement, later IDs will be changed.', id, statement])
			id = statement.tag + '_' + id
		}
		else {
			registry.idMap.set(id, statement)
			return id
		}
	}
	if (attributeMap.has('output')) {
		var output = attributeMap.get('output')
		if (getIsIDUnique(output, registry, statement)) {
			return output
		}
	}
	if (getIsIDUnique(id, registry, statement)) {
		return id
	}
	if (attributeMap.has('work')) {
		id += '_' + attributeMap.get('work')
	}
	if (getIsIDUnique(id, registry, statement)) {
		return id
	}
	var parentMap = statement.parent.attributeMap
	if (parentMap.has('id')) {
		id += '_' + parentMap.get('id')
	}
	if (getIsIDUnique(id, registry, statement)) {
		return id
	}
	return getConcatenatedUniqueID(id, registry, statement)
}

function getTagKeys() {
	var tagKeys = Array.from(gTagCenterMap.keys())
	tagKeys.sort()
	return tagKeys
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
	return getConcatenatedUniqueID(id, registry, statement)
}

function getValueByKeyDefault(defaultValue, key, registry, statement, tag) {
	var value = getAttributeValue(key, statement)
	if (value != undefined) {
		return value
	}

	if (defaultValue == undefined) {
		return undefined
	}

	var defaultMap = registry.idMap.get('_default').attributeMap
	var defaultString = defaultValue.toString()
	var keyValueString = key + ':' + defaultString
	if (defaultMap.has(tag)) {
		var keyValueStrings = defaultMap.get(tag).split(';')
		if (keyValueStrings.indexOf(keyValueString) == -1) {
			keyValueStrings.push(keyValueString)
			defaultMap.set(tag, keyValueStrings.join(';'))
		}
	}
	else {
		defaultMap.set(tag, keyValueString)
	}

	return defaultString
}

function getWorkStatement(registry, statement) {
	return getWorkStatementByKey('work', registry, statement)
}

function getWorkStatementByKey(key, registry, statement) {
	var attributeMap = statement.attributeMap
	if (!attributeMap.has(key)) {
		return undefined
	}
	return registry.idMap.get(statement.attributeMap.get(key))
}

function getWorkStatements(registry, statement) {
	var workIDs = getStrings('work', statement)
	var workStatements = []
	for (var workID of workIDs) {
		workID = workID.trim()
		if (registry.idMap.has(workID)) {
			workStatements.push(registry.idMap.get(workID))
		}
		else {
			noticeByList(['Could not find workStatement in getWorkStatements in statement.', workID, statement])
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

function processRootStatementByTagMap(registry, rootStatement, tagMap) {
	var missingProcessorSet = new Set()
	processStatementsByTagMap(missingProcessorSet, registry, getDescendantsInsideFirst(rootStatement), gTagCenterMap)
	if (missingProcessorSet.size > 0) {
		if (missingProcessorSet.size > 1) {
			console.log('Could not find processors for the tags:')
		}
		else {
			console.log('Could not find a processor for the tag:')
		}
		console.log(missingProcessorSet)
		console.log('The following processors are available:')
		console.log(getTagKeys())
	}
}

function processStatementsByTagMap(missingProcessorSet, registry, statements, tagMap) {
	for (var statement of statements) {
		var tag = statement.tag
		if (tagMap.has(tag)) {
			tagMap.get(tag).processStatement(registry, statement)
		}
		else {
			if (!gValidTagSet.has(tag) && !tag.startsWith('_')) {
				missingProcessorSet.add(tag)
			}
		}
	}
}

function setIDMapSet(id, registry, statement) {
	statement.attributeMap.set('id', id)
	registry.idMap.set(id, statement)
	registry.generatedIDSet.add(id)
}

function widenPolygonBoundingBox(boundingBox, caller, registry, statement) {
	var points = getPointsHD(registry, statement)
	if (points == null) {
		return boundingBox
	}

	var matrix2DUntil = getMatrix2DUntil(caller, registry, statement)
	if (matrix2DUntil != null) {
		transform2DPoints(matrix2DUntil, points)
	}

	for (var point of points) {
		widenBoundingBox(boundingBox, point)
	}

	return boundingBox
}

function widenStatementBoundingBox(boundingBox, caller, registry, statement) {
	if (statement.tag == 'group' || statement.tag == 'g') {
		getMatrix2D(registry, statement)
	}

	if (statement.tag == 'polygon' || statement.tag == 'polyline') {
		if (statement.attributeMap.has('display')) {
			if (statement.attributeMap.get('display') == 'none') {
				return boundingBox
			}
		}
		return widenPolygonBoundingBox(boundingBox, caller, registry, statement)
	}

	return boundingBox
}
