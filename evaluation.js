//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gVariableMapEntries = []

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

function getArrayByMonad(monad, registry, statement) {
	var elements = [monad.getValue(registry, statement)]
	for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
		if (monad.previousMonad == null) {
			elements.reverse()
			return elements
		}
		if (monad.previousMonad.precedenceLevel >= 20) {
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
			monad.precedenceLevel = precedenceMap.get(monad.operatorString)
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
	var value = monad.getValue(registry, statement)
	for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
		if (monad.previousMonad == null) {
			return value
		}
		var previousLevel = monad.previousMonad.precedenceLevel
		if (previousLevel == 21 || previousLevel == 20 || previousLevel == 1) {
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

function processCharacterOperator(character, monad, registry, statement) {
	monad.operatorString += character
	if (monad.previousMonad.previousMonad == null) {
		return
	}
}

function updateIfPrecedenceHigher(monad, registry, statement) {
	if (monad.previousMonad.previousMonad != null) {
		if (monad.previousMonad.previousMonad.precedenceLevel >= monad.precedenceLevel) {
			getResultUpdatePrevious(monad.previousMonad, registry, statement)
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
	this.precedenceLevel = 14
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
	this.precedenceLevel = null
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		processCharacterOperator(character, this, registry, statement)
	}
}

function BracketCloseMonad() {
	this.getNextMonad = function(character, registry, statement) {
		return getNextMonadByMap(character, this, gOperatorMonadMap, registry, statement)
	}
	this.getValue = function(registry, statement) {
		return this.value
	}
	this.precedenceLevel = 21
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		if (this.value != null) {
			return
		}
		if (this.previousMonad.precedenceLevel == 21) {
			this.value = this.previousMonad.getResult(registry, statement, undefined)
			this.previousMonad = this.previousMonad.previousMonad
			return
		}
		var result = getResultUpdatePrevious(this.previousMonad, registry, statement)
		if (this.previousMonad.previousMonad.precedenceLevel == 1) {
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
	this.precedenceLevel = 21
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
		if (this.functionInformation.optionSet != null) {
			if (this.functionInformation.optionSet.has('r')) {
				return this.functionInformation.apply(null, [registry, statement].concat(value))
			}
		}
		return this.functionInformation.apply(null, value)
	}
	this.monadMap = gValueMonadMap
	this.precedenceLevel = 21
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		this.functionInformation = this.previousMonad.getRawValue(statement)
		if (this.functionInformation == null) {
 			warningByList(['In BracketOpenFunctionMonad, could not find function for: ', this.previousMonad.valueString])
  			zeroFunction.optionSet = null
			this.functionInformation = zeroFunction
		}
		this.previousMonad = this.previousMonad.previousMonad
		if (this.functionInformation.optionSet != null) {
			if (this.functionInformation.optionSet.has('s')) {
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
	this.precedenceLevel = 1
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
	this.precedenceLevel = null
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		processCharacterOperator(character, this, registry, statement)
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
	this.precedenceLevel = 11
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		processCharacterOperator(character, this, registry, statement)
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
	this.precedenceLevel = 12
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		processCharacterOperator(character, this, registry, statement)
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
	this.precedenceLevel = 20
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
	this.precedenceLevel = 17
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
	this.precedenceLevel = 17
	this.previousMonad = null
	this.processCharacter = function(character, registry, statement) {
		this.operatorCharacter = character
	}
}

function NullMonad() {
	this.getValue = function(registry, statement) {
		return null
	}
	this.precedenceLevel = null
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
	this.precedenceLevel = null
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
	this.precedenceLevel = null
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
		return getNextMonadByMap(character, this, gOperatorSquareMonadMap, registry, statement)
	}
	this.getValue = function(registry, statement) {
		return this.value
	}
	this.precedenceLevel = 20
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
	this.precedenceLevel = 20
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
	this.precedenceLevel = 20
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
	this.precedenceLevel = null
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
	this.precedenceLevel = 1
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
	this.precedenceLevel = null
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
			return getVariableValue(this.valueString, statement)
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
	this.precedenceLevel = null
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
gOperatorMonads = [[')', BracketCloseMonad], [',', CommaMonad], [']', SquareCloseMonad]]
addValueToArrayByKeys(gOperatorMonads, gAdditionSubtractionCharacters, AdditionSubtractionMonad)
addValueToArrayByKeys(gOperatorMonads, gBooleanCharacters, BooleanMonad)
addValueToArrayByKeys(gOperatorMonads, gDivisionMultiplicationCharacters, DivisionMultiplicationMonad)
addValueToArrayByKeys(gOperatorMonads, gEqualityCharacters, EqualityMonad)
addValueToArrayByKeys(gOperatorMonads, gGreaterLessCharacters, GreaterLessMonad)

// monadMaps
gBooleanMap = new Map([['??', 5], ['||', 6], ['&&', 7], ['|', 8], ['^', 9], ['&', 10]])
gBracketCommaMonadMap = new Map([[')', BracketCloseMonad], [',', CommaMonad]])
gDivisionMap = new Map([['*', 15], ['/', 15], ['%', 15], ['**', 16]])
gGreaterLessMap = new Map([['>', 12], ['>:', 12], ['<', 12], ['<:', 12], ['<<', 13], ['>>', 13], ['>>>', 13]])
gNegatedMap = new Map(gAlphabetBracketMonads)
gOperatorMonadMap = new Map(gOperatorMonads)
gOperatorBracketMonadMap = new Map(gOperatorMonads)
gOperatorBracketMonadMap.set('(', BracketOpenFunctionMonad)
gOperatorBracketMonadMap.set('.', MemberMonad)
gOperatorBracketMonadMap.set('[', SquareOpenArrayMonad)
gOperatorSquareMonadMap = new Map(gOperatorMonads)
gOperatorSquareMonadMap.set('[', SquareOpenArrayMonad)
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

// others
gEquationSet = new Set(gGreaterLessCharacters.concat(gNotCharacters).concat(gQuoteCharacters).concat('()[]'.split('')))
gFloatSet = new Set(gFloatCharacters)
