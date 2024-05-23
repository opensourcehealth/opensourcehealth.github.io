//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gFunctionMap = new Map()

function addValueToArrayByKeys(array, keys, value) {
	for (var key of keys) {
		array.push([key, value])
	}
	return array
}

function addValueToMapByKeys(keys, map, value) {
	for (var key of keys) {
		map.set(key, value)
	}
	return map
}

function createCommaReturnUndefined(monad) {
	if (monad.createdPrevious) {
		return undefined
	}
	var commaMonad = new CommaMonad()
	commaMonad.previousMonad = monad.previousMonad
	monad.previousMonad = commaMonad
	monad.createdPrevious = true
	return undefined
}

function getAlphabeticSuffix(text) {
	for (var characterIndex = 0; characterIndex < text.length; characterIndex++) {
		if (gAlphabetSet.has(text[characterIndex])) {
			return text.slice(characterIndex)
		}
	}
	return ''
}

function getArrayByMonad(monad, registry, statement) {
	var elements = [monad.getValue(registry, statement)]
	for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
		if (monad.previousMonad == null) {
			elements.reverse()
			return elements
		}
		if (monad.previousMonad.precedence >= 20) {
			elements.reverse()
			return elements
		}
		var previousPrevious = monad.previousMonad.previousMonad
		elements.push(previousPrevious.getValue(registry, statement))
		monad.previousMonad = previousPrevious.previousMonad
	}
	return null
}

function getFloatByEquationIfNaN(registry, statement, valueString) {
	if (isNaN(valueString)) {
		return getValueByEquation(registry, statement, valueString)
	}
	return parseFloat(valueString)
}

function getIntByEquationIfNaN(registry, statement, valueString) {
	if (isNaN(valueString)) {
		return getValueByEquation(registry, statement, valueString)
	}
	return parseInt(valueString)
}

function getNextMonadByMap(character, monad, monadMap, registry, statement) {
	if (monadMap.has(character)) {
		var nextMonad = new (monadMap.get(character))()
		nextMonad.previousMonad = monad
		nextMonad.processCharacter(character, registry, statement)
		return nextMonad
	}
	return monad
}

function getNextMonadPrecedenceProcessByMap(character, monad, monadMap, precedenceMap, registry, statement) {
	var nextMonad = monad
	if (monadMap.has(character)) {
		monad.operatorString = monad.operatorString.trim()
		if (precedenceMap.has(monad.operatorString)) {
			monad.precedence = precedenceMap.get(monad.operatorString)
		}
		updateIfPrecedenceHigher(monad, registry, statement)
		nextMonad = new (monadMap.get(character))()
		nextMonad.previousMonad = monad
	}
	nextMonad.processCharacter(character, registry, statement)
	return nextMonad
}

function getNextMonadProcessByMap(character, monad, monadMap, registry, statement) {
	var nextMonad = monad
	if (monadMap.has(character)) {
		nextMonad = new (monadMap.get(character))()
		nextMonad.previousMonad = monad
	}
	nextMonad.processCharacter(character, registry, statement)
	return nextMonad
}

function getResultByMonad(monad, registry, statement) {
	return getResultByMonadPrecedence(monad, -1, registry, statement)
}

function getResultByMonadPrecedence(monad, precedence, registry, statement) {
	var value = monad.getValue(registry, statement)
	for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
		if (monad.previousMonad == null) {
			return value
		}
		var previousPrecedence = monad.previousMonad.precedence
		if (previousPrecedence == 21 || previousPrecedence == 20 || previousPrecedence == 1) {
			return value
		}
		if (previousPrecedence < precedence) {
			return value
		}
		value = monad.previousMonad.getResult(registry, statement, value)
		monad.previousMonad = monad.previousMonad.previousMonad.previousMonad
	}
	return null
}

function getResultUpdatePrevious(monad, registry, statement) {
	var value = getResultByMonad(monad, registry, statement)
	monad.setValue(value)
	return value
}

function getValueByEquation(registry, statement, valueString) {
	return evaluator.getValueByEquation(registry, statement, valueString)
/*
	var valueOld = getValueByEquationOld(registry, statement, valueString)
	var value = evaluator.getValueByEquation(registry, statement, valueString)
	if (value == undefined) {
		console.log('valueString')
		console.log(valueString)
		console.log(valueOld)
		console.log(value)
		return
	}

	if (value.toString() != valueOld.toString()) {
		console.log('valueString')
		console.log(valueString)
		console.log(valueOld)
		console.log(value)
	}
	return value
*/
}

function getValueByEquationOld(registry, statement, valueString) {
	var monad = new StartMonad()
	for (var character of valueString) {
		monad = monad.getNextMonad(character, registry, statement)
	}
	var value = getResultUpdatePrevious(monad, registry, statement)
	if (monad.previousMonad == null) {
		return value
	}
	return getArrayByMonad(monad, registry, statement)
}

function updateIfPrecedenceHigher(monad, registry, statement) {
	var previousMonad = monad.previousMonad
	if (previousMonad.previousMonad != null) {
		if (previousMonad.previousMonad.precedence >= monad.precedence) {
			previousMonad.setValue(getResultByMonadPrecedence(previousMonad, monad.precedence, registry, statement))
		}
	}
}

function zeroFunction(ignoredArguments) {
	return 0
}

function AdditionSubtractionMonad() {
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadByMap(character, this, gValueMonadMap, registry, statement)
	}
	this.getResult = function(registry, statement, value) {
		var previousValue = this.previousMonad.getValue(registry, statement)
		if (this.operatorCharacter == '+') {
			return previousValue + value
		}
		return previousValue - value
	}
	this.operatorCharacter = null
	this.precedence = 14
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		this.operatorCharacter = character
		updateIfPrecedenceHigher(this, registry, statement)
	}
}

function BooleanMonad() {
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadPrecedenceProcessByMap(character, this, gValueMonadMap, gBooleanMap, registry, statement)
	}
	this.getResult = function(registry, statement, value) {
		var previousValue = this.previousMonad.getValue(registry, statement)
		this.operatorString = this.operatorString.trim()
		if (this.operatorString == '&') {
			return previousValue & value
		}
		if (this.operatorString == '^') {
			return previousValue ^ value
		}
		if (this.operatorString == '|') {
			return previousValue | value
		}
		if (this.operatorString == '&&') {
			return previousValue && value
		}
		if (this.operatorString == '||') {
			return previousValue || value
		}
		if (this.operatorString == '??') {
			return previousValue ?? value
		}
		return null
	}
	this.operatorString = ''
	this.precedence = null
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		this.operatorString += character
	}
}

function BracketCloseMonad() {
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadByMap(character, this, gBracketCloseMonadMap, registry, statement)
	}
	this.getValue = function(registry, statement) {
		return this.value
	}
	this.precedence = 21
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		if (this.value != null) {
			return
		}
		var previousName = this.previousMonad.constructor.name
		if (previousName == 'BracketOpenMonad' || previousName == 'BracketOpenFunctionMonad') {
			this.value = this.previousMonad.getResult(registry, statement, undefined)
			this.previousMonad = this.previousMonad.previousMonad
			return
		}
		var result = getResultUpdatePrevious(this.previousMonad, registry, statement)
		if (this.previousMonad.previousMonad.precedence == 1) {
			result = getArrayByMonad(this.previousMonad, registry, statement)
		}
		else {
			result = [result]
		}
		this.value = this.previousMonad.previousMonad.getResult(registry, statement, result)
		this.previousMonad = this.previousMonad.previousMonad.previousMonad
	}
	this.setValue = function(value) {
		this.value = value
	}
	this.value = null
}

function BracketOpenMonad() {
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadByMap(character, this, gValueMonadMap, registry, statement)
	}
	this.getResult = function(registry, statement, value) {
		return value
	}
	this.precedence = 21
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
	}
}

function BracketOpenFunctionMonad() {
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadByMap(character, this, this.monadMap, registry, statement)
	}
	this.getResult = function(registry, statement, value) {
		var argumentLength = this.functionInformation.length
		if (this.functionInformation.optionMap != null) {
			if (this.functionInformation.optionMap.has('r')) {
				return this.functionInformation.apply(null, [registry, statement].concat(value))
			}
		}
		return this.functionInformation.apply(null, value)
	}
	this.monadMap = gValueMonadMap
	this.precedence = 21
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		this.functionInformation = this.previousMonad.getRawValue(statement)
		if (this.functionInformation == null) {
 			warningByList(['In BracketOpenFunctionMonad, could not find function for: ', this.previousMonad.valueString])
  			zeroFunction.optionMap = null
			this.functionInformation = zeroFunction
		}
		this.previousMonad = this.previousMonad.previousMonad
		if (this.functionInformation.optionMap != null) {
			if (this.functionInformation.optionMap.has('s')) {
				this.monadMap = gStringMonadMap
			}
		}
	}
	this.functionInformation = null
}

function CommaMonad() {
	this.createdPrevious = false
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadByMap(character, this, gValueMonadMap, gDivisionMap, registry, statement)
	}
	this.getResult = function(registry, statement, value) {
		return null
	}
	this.getValue = function(registry, statement) {
		return createCommaReturnUndefined(this)
	}
	this.precedence = 1
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		updateIfPrecedenceHigher(this, registry, statement)
	}
	this.setValue = function(value) {
	}
}

function DivisionMultiplicationMonad() {
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadPrecedenceProcessByMap(character, this, gValueMonadMap, gDivisionMap, registry, statement)
	}
	this.getResult = function(registry, statement, value) {
		this.operatorString = this.operatorString.trim()
		var previousValue = this.previousMonad.getValue(registry, statement)
		if (this.operatorString == '*') {
			return previousValue * value
		}
		if (this.operatorString == '/') {
			return previousValue / value
		}
		if (this.operatorString == '**') {
			return previousValue ** value
		}
		if (this.operatorString == '%') {
			return previousValue % value
		}
		return null
	}
	this.operatorString = ''
	this.precedence = null
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		this.operatorString += character
	}
}

function EqualityMonad() {
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadProcessByMap(character, this, gValueMonadMap, registry, statement)
	}
	this.getResult = function(registry, statement, value) {
		var previousValue = this.previousMonad.getValue(registry, statement)
		this.operatorString = this.operatorString.trim()
		if (this.operatorString == '::') {
			return previousValue == value
		}
		if (this.operatorString == '!:') {
			return previousValue != value
		}
		return null
	}
	this.operatorString = ''
	this.precedence = 11
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		this.operatorString += character
	}
}

function GreaterLessMonad() {
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadPrecedenceProcessByMap(character, this, gValueMonadMap, gGreaterLessMap, registry, statement)
	}
	this.getResult = function(registry, statement, value) {
		var previousValue = this.previousMonad.getValue(registry, statement)
		this.operatorString = this.operatorString.trim()
		if (this.operatorString == '>') {
			return previousValue > value
		}
		if (this.operatorString == '<') {
			return previousValue < value
		}
		if (this.operatorString == '>:') {
			return previousValue >= value
		}
		if (this.operatorString == '<:') {
			return previousValue <= value
		}
		if (this.operatorString == '<<') {
			return previousValue << value
		}
		if (this.operatorString == '>>') {
			return previousValue >> value
		}
		if (this.operatorString == '>>>') {
			return previousValue >>> value
		}
		return null
	}
	this.operatorString = ''
	this.precedence = 12
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		this.operatorString += character
	}
}

function MemberMonad() {
	this.getNextMonad = function(character, registry, statement) {
		if (gValueMonadMap.has(character)) {
			var nextMonad = new (gValueMonadMap.get(character))()
			nextMonad.previousMonad = this.previousMonad.previousMonad
			nextMonad.previousMap = this.previousMap
			nextMonad.processCharacter(character, registry, statement)
			return nextMonad
		}
		return this
	}
	this.precedence = 20
	this.previousMap = null
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		this.previousMap = this.previousMonad.getMapValue(registry, statement)
	}
}

function NegativeMonad() {
	this.getNextMonad = function(character, registry, statement) {
		if (gFloatSet.has(character)) {
			var numberMonad = new NumberMonad()
			numberMonad.previousMonad = this.previousMonad
			numberMonad.valueString = '-' + character
			return numberMonad
		}
		if (gNegatedMap.has(character)) {
			var nullMonad = new NullMonad()
			nullMonad.previousMonad = this.previousMonad
			this.previousMonad = nullMonad
			var nextMonad = new (gNegatedMap.get(character))()
			nextMonad.previousMonad = this
			nextMonad.processCharacter(character, registry, statement)
			return nextMonad
		}
		return this
	}
	this.getResult = function(registry, statement, value) {
		return -value
	}
	this.precedence = 17
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
	}
}

function NotMonad() {
	this.getNextMonad = function(character, registry, statement) {
		if (gValueMonadMap.has(character)) {
			var nullMonad = new NullMonad()
			nullMonad.previousMonad = this.previousMonad
			this.previousMonad = nullMonad
			var nextMonad = new (gValueMonadMap.get(character))()
			nextMonad.previousMonad = this
			nextMonad.processCharacter(character, registry, statement)
			return nextMonad
		}
		return this
	}
	this.getResult = function(registry, statement, value) {
		if (this.operatorCharacter == '!') {
			return !value
		}
		return ~value
	}
	this.operatorCharacter = null
	this.precedence = 17
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		this.operatorCharacter = character
	}
}

function NullMonad() {
	this.getValue = function(registry, statement) {
		return null
	}
	this.precedence = null
	this.previousMonad = null
	this.setValue = function(value) {
	}
}

function NumberMonad() {
	this.appendAdditionSubtraction = false
	this.getNextMonad = function(character, registry, statement) {
		if (this.appendAdditionSubtraction) {
			if (character == '-' || character == '+') {
				this.processCharacter(character, registry, statement)
				this.appendAdditionSubtraction = false
				return this
			}
		}
		if (character == 'e') {
			this.processCharacter(character, registry, statement)
			this.appendAdditionSubtraction = true
			return this
		}
		return getNextMonadProcessByMap(character, this, gOperatorMonadMap, registry, statement)
	}
	this.getValue = function(registry, statement) {
		if (this.value == null) {
			this.value = parseFloat(this.valueString)
		}
		return this.value
	}
	this.precedence = null
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		this.valueString += character
	}
	this.value = null
	this.valueString = ''
	this.setValue = function(value) {
		this.value = value
	}
}

function QuoteMonad() {
	this.getNextMonad = function(character, registry, statement) {
		if (this.processing) {
			if (character == this.quoteCharacter) {
				this.processing = false
			}
			else {
				this.valueString = this.valueString.concat(character)
			}
			return this
		}
		return getNextMonadByMap(character, this, gOperatorBracketMonadMap, registry, statement)
	}
	this.getValue = function(registry, statement) {
		return this.valueString
	}
	this.precedence = null
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		this.quoteCharacter = character
	}
	this.processing = true
	this.quoteCharacter = null
	this.setValue = function(valueString) {
		this.valueString = valueString
	}
	this.valueString = ''
}

function SquareCloseMonad() {
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadByMap(character, this, gBracketCloseMonadMap, registry, statement)
	}
	this.getValue = function(registry, statement) {
		return this.value
	}
	this.precedence = 20
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		if (this.value != null) {
			return
		}
		if (this.previousMonad.constructor.name == 'SquareOpenArrayMonad') {
			this.value = []
			return
		}
		getResultUpdatePrevious(this.previousMonad, registry, statement)
		var result = getArrayByMonad(this.previousMonad, registry, statement)
		this.value = this.previousMonad.previousMonad.getResult(registry, statement, result)
		this.previousMonad = this.previousMonad.previousMonad.previousMonad
	}
	this.setValue = function(value) {
		this.value = value
	}
	this.value = null
}

function SquareOpenArrayMonad() {
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadByMap(character, this, gValueMonadMap, registry, statement)
	}
	this.getResult = function(registry, statement, value) {
		return this.previousMonadValue[value[0]]
	}
	this.precedence = 20
	this.previousMonad = null
	this.previousMonadValue = null
	this.processCharacter = function(character, registry, statement) {
		this.previousMonadValue = this.previousMonad.getValue(registry, statement)
		this.previousMonad = this.previousMonad.previousMonad
	}
}

function SquareOpenMonad() {
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadByMap(character, this, gValueMonadMap, registry, statement)
	}
	this.getResult = function(registry, statement, value) {
		return value
	}
	this.precedence = 20
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
	}
}

function StartMonad() {
	this.getNextMonad = function(character, registry, statement) {
		if (gValueMonadMap.has(character)) {
			var nextMonad = new (gValueMonadMap.get(character))()
			nextMonad.processCharacter(character, registry, statement)
			return nextMonad
		}
		return this
	}
}

function StringMonad() {
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadProcessByMap(character, this, gBracketCommaMonadMap, registry, statement)
	}
	this.getValue = function(registry, statement) {
		return this.valueString
	}
	this.precedence = null
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		this.valueString = this.valueString.concat(character)
	}
	this.setValue = function(valueString) {
	}
	this.valueString = ''
}

function UndefinedCommaMonad() {
	this.createdPrevious = false
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadByMap(character, this, gValueMonadMap, gDivisionMap, registry, statement)
	}
	this.getResult = function(registry, statement, value) {
		return null
	}
	this.getValue = function(registry, statement) {
		return createCommaReturnUndefined(this)
	}
	this.precedence = 1
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		var undefinedMonad = new UndefinedMonad()
		undefinedMonad.previousMonad = this.previousMonad
		this.previousMonad = undefinedMonad
	}
	this.setValue = function(value) {
	}
}

function UndefinedMonad() {
	this.getValue = function(registry, statement) {
		return undefined
	}
	this.precedence = null
	this.previousMonad = null
	this.setValue = function(value) {
	}
}

function VariableMonad() {
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadProcessByMap(character, this, gOperatorBracketMonadMap, registry, statement)
	}
	this.getMapValue = function(registry, statement) {
		if (this.value == null) {
			this.value = this.getRawValue(statement)
		}
		return this.value
	}
	this.getRawValue = function(statement) {
		this.valueString = this.valueString.trim()
		if (this.previousMap == null) {
			var variableValue = getVariableValue(this.valueString, statement)
			if (variableValue == undefined) {
				if (gFunctionMap.has(this.valueString)) {
					variableValue = gFunctionMap.get(this.valueString)
				}
			}
			return variableValue
		}
		return this.previousMap.get(this.valueString)
	}
	this.getValue = function(registry, statement) {
		if (this.value == null) {
			var variableString = this.getRawValue(statement)
			if (variableString == undefined) {
				if (this.valueString == 'true') {
					this.value = true
				}
				else {
					if (this.valueString == 'false') {
						this.value = false
					}
					else {
						this.value = undefined
					}
				}
			}
			else {
				if (isNaN(variableString)) {
					this.value = getValueByEquation(registry, statement, variableString)
				}
				else {
					if (variableString.indexOf('.') != -1) {
						this.value = parseFloat(variableString)
					}
					else {
						this.value = parseInt(variableString)
					}
				}
			}
		}
		return this.value
	}
	this.precedence = null
	this.previousMap = null
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		this.valueString += character
	}
	this.setValue = function(value) {
		this.value = value
	}
	this.value = null
	this.valueString = ''
}

// characterArrays
gAdditionSubtractionCharacters = ['+', '-']
gAlphabetCharacters = 'abcdefghijklmnopqrstuvwxyz_ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
gBooleanCharacters = '^&|?'.split('')
gDivisionMultiplicationCharacters = '*/%'.split('')
gEqualityCharacters = ['!', ':']
gFloatCharacters = '.0123456789'.split('')
gGreaterLessCharacters = ['>', '<']
gNotCharacters = ['!', '~']
gQuoteCharacters = ['"', "'"]

// monadEntries
gAlphabetBracketMonads = [['(', BracketOpenMonad], ['[', SquareOpenMonad]]
addValueToArrayByKeys(gAlphabetBracketMonads, gAlphabetCharacters, VariableMonad)
addValueToArrayByKeys(gAlphabetBracketMonads, gNotCharacters, NotMonad)
gMemberSquareMonads = [['.', MemberMonad], ['[', SquareOpenArrayMonad]]
gOperatorMonads = [[')', BracketCloseMonad], [',', CommaMonad], [']', SquareCloseMonad]]
addValueToArrayByKeys(gOperatorMonads, gAdditionSubtractionCharacters, AdditionSubtractionMonad)
addValueToArrayByKeys(gOperatorMonads, gBooleanCharacters, BooleanMonad)
addValueToArrayByKeys(gOperatorMonads, gDivisionMultiplicationCharacters, DivisionMultiplicationMonad)
addValueToArrayByKeys(gOperatorMonads, gEqualityCharacters, EqualityMonad)
addValueToArrayByKeys(gOperatorMonads, gGreaterLessCharacters, GreaterLessMonad)

// monadMaps
gBooleanMap = new Map([['??', 5], ['||', 6], ['&&', 7], ['|', 8], ['^', 9], ['&', 10]])
gBracketCloseMonadMap = new Map(gOperatorMonads.concat(gMemberSquareMonads))
gBracketCommaMonadMap = new Map([[')', BracketCloseMonad], [',', CommaMonad]])
gDivisionMap = new Map([['*', 15], ['/', 15], ['%', 15], ['**', 16]])
gGreaterLessMap = new Map([['>', 12], ['>:', 12], ['<', 12], ['<:', 12], ['<<', 13], ['>>', 13], ['>>>', 13]])
gNegatedMap = new Map(gAlphabetBracketMonads)
gOperatorMonadMap = new Map(gOperatorMonads)
gOperatorBracketMonadMap = new Map(gBracketCloseMonadMap)
gOperatorBracketMonadMap.set('(', BracketOpenFunctionMonad)
gStringMonadMap = new Map([[')', BracketCloseMonad], [',', CommaMonad]])
addValueToMapByKeys(gQuoteCharacters, gStringMonadMap, QuoteMonad)
addValueToMapByKeys(gAlphabetCharacters, gStringMonadMap, StringMonad)
addValueToMapByKeys(gFloatCharacters, gStringMonadMap, StringMonad)
addValueToMapByKeys('+-^&|?*/%!:><'.split(''), gStringMonadMap, StringMonad)
gValueMonadMap = new Map(gAlphabetBracketMonads)
addValueToMapByKeys(gFloatCharacters, gValueMonadMap, NumberMonad)
addValueToMapByKeys(gQuoteCharacters, gValueMonadMap, QuoteMonad)
gValueMonadMap.set(')', BracketCloseMonad)
gValueMonadMap.set('-', NegativeMonad)
gValueMonadMap.set(']', SquareCloseMonad)
gValueMonadMap.set(',', UndefinedCommaMonad)

// sets
gAlphabetSet = new Set(gAlphabetCharacters)
gEquationSet = new Set(gGreaterLessCharacters.concat(gNotCharacters).concat(gQuoteCharacters).concat('()[]'.split('')))
gFloatSet = new Set(gFloatCharacters)
gLowerCaseSet = new Set('abcdefghijklmnopqrstuvwxyz'.split(''))
gUpperCaseSet = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))


















var evaluator = {
accessElement: function(evaluation, value) {
	evaluation.monad = evaluation.monad.parent
	evaluation.monad.value = evaluation.monad.value[value]
	evaluation.processorCharacters.length = 0
	evaluation.processor = evaluationProcessorOperator
},

accessOpen: function(character, evaluation) {
	evaluation.monad = {close:evaluator.accessElement, parent:evaluation.monad}
	evaluation.processorCharacters.length = 0
	evaluation.processor = evaluationProcessorValue
},

addition: function(a, b) {
	return a + b
},

and: function(a, b) {
	return a && b
},

arrayOpen: function(character, evaluation) {
	var value = evaluator.getValueIfDefined(evaluation)
	if (value != undefined) {
		evaluation.monad = {parent:evaluation.monad, value:value}
		evaluator.accessOpen(character, evaluation)
		return
	}

	evaluation.monad = {close:evaluator.squareClose, parent:evaluation.monad, value:[]}
	evaluation.processorCharacters.length = 0
	evaluation.processor = evaluationProcessorValue
},

bitwise: function(character, evaluation) {
	evaluator.convertToMonad(evaluation)
	evaluator.setOperationMonadToKey(evaluation, character, evaluationProcessorOperator.bitwiseMap)
},

bitwiseAND: function(a, b) {
	return a & b
},

bitwiseXOR: function(a, b) {
	return a ^ b
},

bitwiseOR: function(a, b) {
	return a | b
},

bitwiseShiftLeft: function(a, b) {
	return a << b
},

bitwiseShiftRight: function(a, b) {
	return a >> b
},

bracketClose: function(character, evaluation) {
	evaluator.convertToMonad(evaluation)
	var value = evaluator.getTotalValue(evaluation)
	if (evaluation.monad.close == undefined) {
		return
	}

	evaluation.monad.close(evaluation, value)
	evaluation.monad.close = undefined
},

callFunction: function(evaluation, value) {
	evaluation.monad.value.push(value)
	var arguments = evaluation.monad.value
	var optionMap = evaluation.monad.monadFunction.optionMap
	if (optionMap != undefined) {
		if (optionMap.has('r')) {
			arguments = [evaluation.registry, evaluation.statement].concat(arguments)
		}
	}

	evaluation.monad.value = evaluation.monad.monadFunction.apply(null, arguments)
	evaluation.processorCharacters.length = 0
	evaluation.processor = evaluationProcessorOperator
},

comma: function(character, evaluation) {
	evaluator.convertValuePush(evaluation)
	if (evaluation.monad.processor == undefined) {
		evaluation.processor = evaluationProcessorValue
	}
	else {
		evaluation.processor = evaluation.monad.processor
	}
},

comparison: function(character, evaluation) {
	evaluator.convertToMonadIfDefined(evaluation)
	evaluation.processor = evaluationProcessorComparison
	evaluation.processor.process(character, evaluation)
},

convertToMonad: function(evaluation) {
	if (evaluation.processor.getValue != undefined) {
		evaluation.monad = {parent:evaluation.monad, value:evaluation.processor.getValue(evaluation)}
	}

	evaluation.processorCharacters.length = 0
},

convertToMonadIfDefined: function(evaluation) {
	var value = this.getValueIfDefined(evaluation)
	if (value != undefined) {
		evaluation.monad = {parent:evaluation.monad, value:value}
	}

	evaluation.processorCharacters.length = 0
},

convertValuePush: function(evaluation) {
	this.convertToMonad(evaluation)
	this.totalValuePush(evaluation)
},

division: function(a, b) {
	return a / b
},

dot: function(character, evaluation) {
	evaluation.monad = {operation:evaluator.memberAccess, parent:evaluation.monad, precedence: 20}
	evaluation.processorCharacters.length = 0
	evaluation.processor = evaluationProcessorString
	evaluation.processor.stringMap = evaluationProcessorValue.valueMap
},

equal: function(a, b) {
	return a == b
},

getTotalValue: function (evaluation) {
	var endMonad = evaluation.monad
	var monad = evaluation.monad
	var precedenceMonads = []
	for (var whileCount = 0; whileCount < gLengthLimit; whileCount++) {
		var parent = monad.parent
		if (Array.isArray(parent.value) || parent.close != undefined) {
			break
		}
		var granparent = parent.parent
		if (parent.operation != undefined) {
			if (granparent.value == undefined || Array.isArray(granparent.value)) {
				monad.parent = granparent
				if (parent.operation == this.division) {
					monad.value = 1.0 / monad.value
				}
				if (parent.operation == this.not) {
					monad.value = !monad.value
				}
				if (parent.operation == this.subtraction) {
					monad.value = -monad.value
				}
				if (Array.isArray(monad.parent.value)) {
					break
				}
			}
		}
		monad = parent
	}

	var parent = evaluation.monad.parent
	for (var whileCount = 0; whileCount < gLengthLimit; whileCount++) {
		if (parent.operation == undefined) {
			break
		}
		var granparent = parent.parent
		precedenceMonads.push([parent.precedence, whileCount, parent])
		parent.child = evaluation.monad
		evaluation.monad = granparent
		parent = evaluation.monad.parent
	}

	evaluation.monad = evaluation.monad.parent
	precedenceMonads.sort(arrayKit.compareElementZeroOneDescending)
	for (var precedenceMonad of precedenceMonads) {
		var operationMonad = precedenceMonad[2]
		var child = operationMonad.child
		var grandparent = operationMonad.parent
		child.value = operationMonad.operation(grandparent.value, child.value)
		child.parent = grandparent.parent
		child.parent.child = child
	}

	return endMonad.value
},

getValueByEquation: function (registry, statement, valueString) {
	var evaluation = {processor:evaluationProcessorValue, processorCharacters:[], registry: registry, statement:statement}
	evaluation.monad = {value:[], parent:undefined}
	for (var character of valueString) {
		evaluation.processor.process(character, evaluation)
	}

	this.convertValuePush(evaluation)
	if (evaluation.monad.value == undefined) {
		return undefined
	}

	if (evaluation.monad.value.length == 0) {
		return undefined
	}

	if (evaluation.monad.value.length == 1) {
		return evaluation.monad.value[0]
	}

	return evaluation.monad.value
},

getValueIfDefined: function(evaluation) {
	if (evaluation.processor.getValue == undefined) {
		return undefined
	}

	return evaluation.processor.getValue(evaluation)
},

greaterThan: function(a, b) {
	return a > b
},

greaterThanEqual: function(a, b) {
	return a >= b
},

lessThan: function(a, b) {
	return a < b
},

logical: function(character, evaluation) {
	evaluator.convertToMonad(evaluation)
	evaluation.processor = evaluationProcessorLogical
	evaluation.processor.process(character, evaluation)
},

memberAccess: function(a, b) {
	return a[b]
},

modulo: function(a, b) {
	return a % b
},

multiplication: function(a, b) {
	return a * b
},

multiplyDivide: function(character, evaluation) {
	evaluator.convertToMonadIfDefined(evaluation)
	evaluation.isInverted = false
	evaluation.processor = evaluationProcessorMultiplyDivide
	evaluation.processor.process(character, evaluation)
},

not: function(a) {
	return !a
},

notEqual: function(a, b) {
	return a != b
},

objectClose: function(evaluation, value) {
	evaluation.monad.value.push(value)
	evaluation.monad.value = mapKit.getObjectBySkips(evaluation.monad.value)
	evaluation.processor = evaluationProcessorOperator
},

objectOpen: function(character, evaluation) {
	evaluation.monad = {close:evaluator.objectClose, parent:evaluation.monad, processor:evaluationProcessorString, value:[]}
	evaluation.processorCharacters.length = 0
	evaluation.processor = evaluationProcessorString
	evaluation.processor.stringMap = new Map([[':', evaluator.variableEnd]])
},

or: function(a, b) {
	return a || b
},

plusMinus: function(character, evaluation) {
	evaluator.convertToMonadIfDefined(evaluation)
	evaluation.isInverted = false
	evaluation.processor = evaluationProcessorPlusMinus
	evaluation.processor.process(character, evaluation)
},

quoteClose: function(character, evaluation) {
	evaluation.monad = {parent:evaluation.monad, value:evaluation.processor.getValue(evaluation)}
	evaluation.processorCharacters.length = 0
	evaluation.processor = evaluationProcessorOperator
},

quoteOpen: function(character, evaluation) {
	evaluation.processorCharacters.length = 0
	evaluation.processor = evaluationProcessorString
	evaluationProcessorString.stringMap = evaluationProcessorString.quoteMapMap.get(character)
	evaluation.processor.character = character
},

roundClose: function(evaluation, value) {
	evaluation.monad.value = value
	evaluation.processor = evaluationProcessorOperator
},

roundOpen: function(character, evaluation) {
	var value = evaluator.getValueIfDefined(evaluation)
	if (value == undefined) {
		evaluation.monad = {close:evaluator.roundClose, parent:evaluation.monad}
		evaluation.processorCharacters.length = 0
		evaluation.processor = evaluationProcessorValue
		return
	}

	evaluation.monad = {close:evaluator.callFunction, monadFunction:value, parent:evaluation.monad, value:[]}
	evaluation.processorCharacters.length = 0
	evaluation.processor = evaluationProcessorValue
	var optionMap = evaluation.monad.monadFunction.optionMap
	if (optionMap == undefined) {
		return
	}

	if (optionMap.has('s')) {
		evaluation.monad.processor = evaluationProcessorFunction
		evaluation.processor = evaluationProcessorFunction
	}
},

setBracket: function(monad) {
	evaluation.monad = monad.parent
	evaluation.monad.value = monad.value
	evaluation.processorCharacters.length = 0
	evaluation.processor = evaluationProcessorValue
},

setOperationMonadToKey: function(evaluation, key, map) {
	var operationPrecedence = map.get(key)
	evaluation.monad = {operation:operationPrecedence[0], parent:evaluation.monad, precedence:operationPrecedence[1]}
	evaluation.processor = evaluationProcessorValue
},

space: function(character, evaluation) {
	if (evaluation.processorCharacters.length == 0) {
		return
	}

	evaluation.monad = {parent:evaluation.monad, value:evaluation.processor.getValue(evaluation)}
	evaluation.processorCharacters.length = 0
	evaluation.processor = evaluationProcessorOperator
},

squareClose: function(evaluation, value) {
	evaluation.monad.value.push(value)
	evaluation.processor = evaluationProcessorOperator
},

stringEnd: function(character, evaluation) {
	var value = evaluation.processor.getValue(evaluation).trim()
	if (value.length > 1) {
		var valueZero = value[0]
		if (valueZero == value[value.length - 1]) {
			if (valueZero == '"' || valueZero == "'") {
				value = value.slice(1, value.length - 1)
			}
		}
	}

	evaluation.monad = {parent:evaluation.monad, value}
	evaluation.processorCharacters.length = 0
	evaluation.processor = evaluationProcessorOperator
	evaluation.processor.process(character, evaluation)
},

subtraction: function(a, b) {
	return a - b
},

totalValuePush: function (evaluation) {
	var parent = evaluation.monad.parent
	if (parent == undefined) {
		return
	}

	var value = this.getTotalValue(evaluation)
	if (evaluation.monad.value == undefined) {
		return
	}

	evaluation.monad.value.push(value)
},

variableEnd: function(character, evaluation) {
	var value = evaluation.processor.getValue(evaluation).trim()
	evaluation.monad.value.push(value)
	evaluation.processorCharacters.length = 0
	evaluation.processor = evaluationProcessorValue
}
}

var evaluationProcessorPairs = arrayKit.continueArrays([
['|', evaluator.bitwise], '^', '&',
[')', evaluator.bracketClose], ']', '}',
[',', evaluator.comma],
['=', evaluator.comparison], ':', '>', '<', '!',
['*', evaluator.multiplyDivide], '/', '%',
['+', evaluator.plusMinus], '-',
['(', evaluator.roundOpen]])

var evaluationComparisonPairs = arrayKit.continueArrays([
['<<', [evaluator.bitwiseShiftLeft, 13]],
['>>', [evaluator.bitwiseShiftRight, 13]],
['==', evaluator.equal],
['>', evaluator.greaterThan],
['>=', evaluator.greaterThanEqual], '=>',
['<', evaluator.lessThan],
['!', evaluator.not],
['!=', evaluator.notEqual], '<>', '><'])

var evaluationOperatorPairs = evaluationProcessorPairs.concat(arrayKit.continueArrays([
['[', evaluator.accessOpen],
['.', evaluator.dot],
['a', evaluator.logical], 'o', 'n']))

var evaluationValuePairs = evaluationProcessorPairs.concat(arrayKit.continueArrays([
['[', evaluator.arrayOpen],
['{', evaluator.objectOpen],
['"', evaluator.quoteOpen], "'",
[' ', evaluator.space]]))

var evaluationProcessorComparison = {
process: function(character, evaluation) {
	if (character == (' ')) {
		return
	}

	if (character == ':') {
		character = '='
	}

	if (this.pushSet.has(character)) {
		evaluation.processorCharacters.push(character)
		return
	}

	processorString = evaluation.processorCharacters.join('')
	var operation = this.operationMap.get(processorString)
	if (operation == undefined) {
		return
	}

	var precedence = 5
	if (Array.isArray(operation)) {
		operation = operation[0]
		precedence = operation[1]
	}

	evaluation.monad = {operation:operation, parent:evaluation.monad, precedence: precedence}
	evaluation.processorCharacters.length = 0
	evaluation.processor = evaluationProcessorValue
	evaluation.processor.process(character, evaluation)
},

operationMap: new Map(evaluationComparisonPairs),

pushSet: new Set([':', '=', '>', '<', '!', ' '])
}

var evaluationProcessorLogical = {
process: function(character, evaluation) {
	if (character == ' ') {
		evaluation.processorCharacters.length = 0
		evaluation.processor = evaluationProcessorValue
		return
	}

	evaluation.processorCharacters.push(character)
	processorString = evaluation.processorCharacters.join('')
	if (this.logicalMap.has(processorString)) {
		evaluator.setOperationMonadToKey(evaluation, processorString, this.logicalMap)
		evaluation.processorCharacters.length = 0
	}
},

logicalMap: new Map([['and', [evaluator.and, 2]], ['or', [evaluator.or, 0]]])
}

var evaluationProcessorMultiplyDivide = {
process: function(character, evaluation) {
	if (character == ' ' || character == '*') {
		return
	}

	if (character == '/') {
		evaluation.isInverted = !evaluation.isInverted
		return
	}

	var operation = evaluator.multiplication
	if (evaluation.isInverted) {
		operation = evaluator.division
	}

	evaluation.monad = {parent:evaluation.monad, precedence: 16}
	evaluation.processor = evaluationProcessorValue
	if (character == '%') {
		evaluation.monad.operation = evaluator.modulo
	}
	else {
		evaluation.monad.operation = operation
		evaluation.processor.process(character, evaluation)
	}
}
}

var evaluationProcessorFunction = {
process: function(character, evaluation) {
	evaluation.processor = evaluationProcessorValue
	var monad = evaluation.monad
	var string = monad.monadFunction.optionMap.get('s')
	if (monad.value.length >= string.length) {
		evaluation.processor.process(character, evaluation)
		return
	}

	if (string[monad.value.length] == '0') {
		evaluation.processor.process(character, evaluation)
		return
	}

	evaluation.processor = evaluationProcessorString
	evaluation.processor.stringMap = new Map(arrayKit.continueArrays([
	['"', evaluator.quoteOpen], "'",
	[',', evaluator.stringEnd],
	[')', evaluator.stringEnd]]))
	evaluation.processor.process(character, evaluation)
}
}

var evaluationProcessorOperator = {
bitwiseMap: new Map([
['&', [evaluator.bitwiseAND, 12]],
['^', [evaluator.bitwiseXOR, 11]],
['|', [evaluator.bitwiseOR, 10]]]),

process: function(character, evaluation) {
	if (this.operatorMap.has(character)) {
		this.operatorMap.get(character)(character, evaluation)
	}
},

operatorMap: new Map(evaluationOperatorPairs)
}

var evaluationProcessorPlusMinus = {
process: function(character, evaluation) {
	if (character == ' ' || character == '+') {
		return
	}

	if (character == '-') {
		evaluation.isInverted = !evaluation.isInverted
		return
	}

	var operation = evaluator.addition
	if (evaluation.isInverted) {
		operation = evaluator.subtraction
	}

	evaluation.monad = {operation:operation, parent:evaluation.monad, precedence: 15}
	evaluation.processor = evaluationProcessorValue
	evaluation.processor.process(character, evaluation)
}
}

var evaluationProcessorString = {
getValue: function(evaluation) {
	return evaluation.processorCharacters.join('')
},

process: function(character, evaluation) {
	if (this.stringMap.has(character)) {
		this.stringMap.get(character)(character, evaluation)
		return
	}

	evaluation.processorCharacters.push(character)
},

quoteMapMap: new Map([['"', new Map([['"', evaluator.quoteClose]])], ["'", new Map([["'", evaluator.quoteClose]])]])
}

var evaluationProcessorValue = {
alphabetUnderscoreSet: new Set('abcdefghijklmnopqrstuvwxyz_ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),

floatStartSet: new Set('-.0123456789'.split('')),

getValue: function(evaluation) {
	if (evaluation.processorCharacters.length == 0) {
		return undefined
	}

	processorString = evaluation.processorCharacters.join('')
	if (this.alphabetUnderscoreSet.has(processorString[0])) {
		if (this.reservedMap.has(processorString)) {
			return this.reservedMap.get(processorString)
		}

		var processorStrings = processorString.split('.')
		var processorStringZero = processorStrings[0]
		var processorString = getVariableValue(processorStringZero, evaluation.statement)
		if (processorString == undefined) {
			if (gFunctionMap.has(processorStringZero)) {
				processorString = gFunctionMap.get(processorStringZero)
			}
		}

		if (processorString == undefined) {
			return undefined
		}

		for (var processorStringIndex = 1; processorStringIndex < processorStrings.length; processorStringIndex++) {
			processorString = processorString.get(processorStrings[processorStringIndex])
		}
	}

	if (!arrayKit.getIsEmpty(processorString)) {
		if (this.floatStartSet.has(processorString[0])) {
			if (processorString.indexOf('.') > -1 || processorString.indexOf('e') > -1) {
				return parseFloat(processorString)
			}
			return parseInt(processorString)
		}
		if (processorString[0] == '[') {
			return evaluator.getValueByEquation(evaluation.registry, evaluation.statement, processorString)
		}
	}

	return processorString
},

process: function(character, evaluation) {
	if (this.valueMap.has(character)) {
		this.valueMap.get(character)(character, evaluation)
		return
	}

	evaluation.processorCharacters.push(character)
},

reservedMap: new Map([['false', false], ['null', null], ['true', true], ['undefined', undefined]]),

valueMap: new Map(evaluationValuePairs)
}
