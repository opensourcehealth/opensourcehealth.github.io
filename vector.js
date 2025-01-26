//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var VectorFast = {
add2D: function(elements, adder2D) {
	elements[0] += adder2D[0]
	elements[1] += adder2D[1]
	return elements
},

add3D: function(elements, adder3D) {
	elements[0] += adder3D[0]
	elements[1] += adder3D[1]
	elements[2] += adder3D[2]
	return elements
},

addArray: function(elements, adders, until) {
	var minimumLength = Vector.getMinimumLength(elements, adders, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] += adders[elementIndex]
	}

	return elements
},

//cross(A, B) = [ a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1 ]
crossProduct: function(a, b) {
	return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
},

crossProduct2D: function(a, b) {
	return a[0] * b[1] - a[1] * b[0]
},

distance2D: function(elements, others) {
	return Math.sqrt(VectorFast.distanceSquared2D(elements, others))
},

distanceSquared2D: function(elements, others) {
	return VectorFast.lengthSquared2D(VectorFast.getSubtraction2D(elements, others))
},

distance3D: function(elements, others) {
	return Math.sqrt(VectorFast.distanceSquared3D(elements, others))
},

distanceSquared3D: function(elements, others) {
	return VectorFast.lengthSquared3D(VectorFast.getSubtraction3D(elements, others))
},

distanceArray: function(elements, others, until) {
	return Math.sqrt(VectorFast.distanceSquaredArray(elements, others, until))
},

distanceSquaredArray: function(elements, others, until) {
	var distanceSquared = 0.0
	var minimumLength = Vector.getMinimumLength(elements, others, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		var distance = elements[elementIndex] - others[elementIndex]
		distanceSquared += distance * distance
	}

	return distanceSquared
},

divide2D: function(elements, divisor2D) {
	elements[0] /= divisor2D[0]
	elements[1] /= divisor2D[1]
	return elements
},

divide2DScalar: function(elements, divisorScalar) {
	elements[0] /= divisorScalar
	elements[1] /= divisorScalar
	return elements
},

divide3D: function(elements, divisor3D) {
	elements[0] /= divisor3D[0]
	elements[1] /= divisor3D[1]
	elements[2] /= divisor3D[2]
	return elements
},

divide3DScalar: function(elements, divisorScalar) {
	elements[0] /= divisorScalar
	elements[1] /= divisorScalar
	elements[2] /= divisorScalar
	return elements
},

divideArray: function(elements, divisors, until) {
	var minimumLength = Vector.getMinimumLength(elements, divisors, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] /= divisors[elementIndex]
	}

	return elements
},

divideArrayScalar: function(elements, divisorScalar, until) {
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] /= divisorScalar
	}

	return elements
},

dotProduct2D: function(elements, others) {
	return elements[0] * others[0] + elements[1] * others[1]
},

dotProduct3D: function(elements, others) {
	return elements[0] * others[0] + elements[1] * others[1] + elements[2] * others[2]
},

dotProductArray: function(elements, others, until) {
	var dotProduct = 0.0
	var minimumLength = Vector.getMinimumLength(elements, others, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		dotProduct += elements[elementIndex] * others[elementIndex]
	}

	return dotProduct
},

equal2D: function(elements, others) {
	return elements[0] == others[0] && elements[1] == others[1]
},

equal3D: function(elements, others) {
	return elements[0] == others[0] && elements[1] == others[1] && elements[2] == others[2]
},

equalArray: function(elements, others, until) {
	var minimumLength = Vector.getMinimumLength(elements, others, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		if (elements[elementIndex] != others[elementIndex]) {
			return false
		}
	}

	return true
},

getAddition2D: function(elements, adder2D) {
	return VectorFast.add2D(elements.slice(0, 2), adder2D)
},

getAddition3D: function(elements, adder3D) {
	return VectorFast.add3D(elements.slice(0, 3), adder3D)
},

getAdditionArray: function(elements, adders, until) {
	return VectorFast.addArray(elements.slice(0), adders, until)
},

getDivision2D: function(elements, divisor2D) {
	return VectorFast.divide2D(elements.slice(0, 2), divisor2D)
},

getDivision2DScalar: function(elements, divisorScalar) {
	return VectorFast.divide2DScalar(elements.slice(0, 2), divisorScalar)
},

getDivision3D: function(elements, divisor3D) {
	return VectorFast.divide3D(elements.slice(0, 3), divisor3D)
},

getDivision3DScalar: function(elements, divisorScalar) {
	return VectorFast.divide3DScalar(elements.slice(0, 3), divisorScalar)
},

getDivisionArray: function(elements, divisors, until) {
	return VectorFast.divideArray(elements.slice(0), divisors, until)
},

getDivisionArrayScalar: function(elements, divisorScalar, until) {
	return VectorFast.divideArrayScalar(elements.slice(0), divisorScalar, until)
},

getMultiplication2D: function(elements, multiplier2D) {
	return VectorFast.multiply2D(elements.slice(0, 2), multiplier2D)
},

getMultiplication2DScalar: function(elements, multiplierScalar) {
	return VectorFast.multiply2DScalar(elements.slice(0, 2), multiplierScalar)
},

getMultiplication3D: function(elements, multiplier3D) {
	return VectorFast.multiply3D(elements.slice(0, 3), multiplier3D)
},

getMultiplication3DScalar: function(elements, multiplierScalar) {
	return VectorFast.multiply3DScalar(elements.slice(0, 3), multiplierScalar)
},

getMultiplicationArray: function(elements, multipliers, until) {
	return VectorFast.multiplyArray(elements.slice(0), multipliers, until)
},

getMultiplicationArrayScalar: function(elements, multiplierScalar) {
	return VectorFast.multiplyArrayScalar(elements.slice(0), multiplierScalar)
},

getRotation2DAngle: function(point, angle) {
	return VectorFast.rotate2DVector(Vector.getArrayByElements(point.slice(0), 2), Vector.polarCounterclockwise(angle))
},

getRotation2DVector: function(point, vector) {
	return VectorFast.rotate2DVector(point.slice(0, 2), vector)
},

getRotation2DX: function(point, vector) {
	return point[0] * vector[0] - point[1] * vector[1]
},

getRotation2DY: function(point, vector) {
	return point[0] * vector[1] + point[1] * vector[0]
},

getSubtraction2D: function(elements, subtractor2D) {
	return VectorFast.subtract2D(elements.slice(0, 2), subtractor2D)
},

getSubtraction3D: function(elements, subtractor3D) {
	return VectorFast.subtract3D(elements.slice(0, 3), subtractor3D)
},

getSubtractionArray: function(elements, subtractors, until) {
	return VectorFast.subtractArray(elements.slice(0), subtractors, until)
},

length2D: function(elements) {
	return Math.sqrt(VectorFast.lengthSquared2D(elements))
},

length3D: function(elements) {
	return Math.sqrt(VectorFast.lengthSquared3D(elements))
},

lengthArray: function(elements) {
	return Math.sqrt(Vector.lengthSquaredArray(elements))
},

lengthSquared2D: function(elements) {
	return elements[0] * elements[0] + elements[1] * elements[1]
},

lengthSquared3D: function(elements) {
	return elements[0] * elements[0] + elements[1] * elements[1] + elements[2] * elements[2]
},

multiply2D: function(elements, multiplier2D) {
	elements[0] *= multiplier2D[0]
	elements[1] *= multiplier2D[1]
	return elements
},

multiply2DScalar: function(elements, multiplierScalar) {
	elements[0] *= multiplierScalar
	elements[1] *= multiplierScalar
	return elements
},

multiply3D: function(elements, multiplier3D) {
	elements[0] *= multiplier3D[0]
	elements[1] *= multiplier3D[1]
	elements[2] *= multiplier3D[2]
	return elements
},

multiply3DScalar: function(elements, multiplierScalar) {
	elements[0] *= multiplierScalar
	elements[1] *= multiplierScalar
	elements[2] *= multiplierScalar
	return elements
},

multiplyArray: function(elements, multipliers, until) {
	var minimumLength = Vector.getMinimumLength(elements, multipliers, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] *= multipliers[elementIndex]
	}

	return elements
},

multiplyArrayScalar: function(elements, multiplierScalar, until) {
	var minimumLength = Math.min(elements.length, Value.getValueDefault(until, elements.length))
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] *= multiplierScalar
	}

	return elements
},

rotate2DVector: function(point, vector) {
	var x = point[0] * vector[0] - point[1] * vector[1]
	point[1] = point[0] * vector[1] + point[1] * vector[0]
	point[0] = x
	return point
},

subtract2D: function(elements, subtractor2D) {
	elements[0] -= subtractor2D[0]
	elements[1] -= subtractor2D[1]
	return elements
},

subtract3D: function(elements, subtractor3D) {
	elements[0] -= subtractor3D[0]
	elements[1] -= subtractor3D[1]
	elements[2] -= subtractor3D[2]
	return elements
},

subtractArray: function(elements, subtractors, until) {
	var minimumLength = Vector.getMinimumLength(elements, subtractors, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] -= subtractors[elementIndex]
	}

	return elements
}
}

var Vector = {
add2D: function(elements = 0.0, adder2D = 0.0) {
	return VectorFast.add2D(Vector.getArrayByElements(elements, 2), Vector.getArrayByElements(adder2D, 2))
},

add2DAlongAxis: function(elements = 0.0, adder2D = 0.0) {
	elements = Vector.getArrayByElements(elements, 2)
	adder2D = Vector.getArrayByElements(adder2D, 2)
	if (Math.abs(adder2D[0]) > Math.abs(adder2D[1])) {
		elements[0] += adder2D[0]
	}
	else {
		elements[1] += adder2D[1]
	}
},

add3D: function(elements = 0.0, adder3D = 0.0) {
	return VectorFast.add3D(Vector.getArrayByElements(elements, 3), Vector.getArrayByElements(adder3D, 3))
},

addArray: function(elements = 0.0, adders = 0.0, until) {
	return VectorFast.addArray(Vector.getArrayByElements(elements, until), Vector.getArrayByElements(adders, until))
},

addArrayScalar: function(elements = 0.0, adderScalar = 0.0) {
	elements = Vector.getArrayByValue(elements)
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		elements[elementIndex] += adderScalar
	}

	return elements
},

addElementToArrays: function(arrays, index, value) {
	if (arrays[index] == undefined) {
		arrays[index] = [value]
	}
	else {
		arrays[index].push(value)
	}
},

alongsFromToDistance: function(from = 0.0, to = 1.0, fromDistances = 0.0, toDistances = 10.0) {
	fromDistances = Vector.getArrayByValue(fromDistances)
	toDistances = Vector.getArrayByValue(toDistances)
	var alongs = new Array(fromDistances.length + toDistances.length)
	from = Vector.getArrayByValue(from, 2)
	to = Vector.getArrayByValue(to, 2)
	var oneOverDistance = 1.0 / VectorFast.distanceArray(from, to)
	var arrayIndex = 0
	for (var fromIndex = 0; fromIndex < fromDistances.length; fromIndex++) {
		alongs[arrayIndex++] = oneOverDistance * fromDistances[fromIndex]
	}

	for (var toIndex = 0; toIndex < toDistances.length; toIndex++) {
		alongs[arrayIndex++] = 1.0 + oneOverDistance * toDistances[toIndex]
	}

	return alongs
},

arrayAtIndex: function(elements = 0.0, index = 0) {
	elements = Vector.getArrayByValue(elements)
	var outputs = new Array(elements.length)
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		var element = elements[elementIndex]
		if (Array.isArray(element)) {
			if (element.length == 0) {
				outputs[elementIndex] = undefined
			}
			else {
				outputs[elementIndex] = element[(index + element.length) % element.length]
			}
		}
		else {
			outputs[elementIndex] = undefined
		}
	}

	return outputs
},

arrayIsClose: function(elements, others) {
	if (elements.length != others.length) {
		return false
	}
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (Math.abs(elements[elementIndex] - others[elementIndex]) > gClose) {
			return false
		}
	}

	return true
},

bracket: function(center = 0.0, side = 1.0) {
	return [center - side, center + side]
},

compareAbsoluteElementTwoAscending: function(a, b) {
	return Math.abs(a[2]) - Math.abs(b[2])
},

compareArrayAscending: function(a, b) {
	var minimumLength = Math.min(a.length, b.length)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		if (a[0][elementIndex] != b[0][elementIndex]) {
			return a[0][elementIndex] - b[0][elementIndex]
		}
	}

	return 0
},

compareArrayDescending: function(a, b) {
	var minimumLength = Math.min(a.length, b.length)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		if (a[0][elementIndex] != b[0][elementIndex]) {
			return b[0][elementIndex] - a[0][elementIndex]
		}
	}

	return 0
},

compareCrossProduct: function(a, b) {
	return VectorFast.crossProduct2D(a[a.length - 1], b[b.length - 1])
},

compareElementZeroAscending: function(a, b) {
	return a[0] - b[0]
},

compareElementZeroDescending: function(a, b) {
	return b[0] - a[0]
},

compareElementZeroOneDescending: function(a, b) {
	if (Math.abs(a[0] - b[0]) < gClose) {
		return b[1] - a[1]
	}

	return b[0] - a[0]
},

compareElementZeroTwoAscending: function(a, b) {
	if (Math.abs(a[0] - b[0]) < gClose) {
		return a[2] - b[2]
	}

	return a[0] - b[0]
},

compareIDAscending: function(a, b) {
	return a.id > b.id
},

compareNumberAscending: function(a, b) {
	return a - b
},

compareNumberDescending: function(a, b) {
	return b - a
},

compareSignedIntersectionAscending: function(a, b) {
	if (a[0] == b[0]) {
		return a[1] - b[1]
	}

	return a[0] - b[0]
},

compareStringZeroAscending: function(a, b) {
	return a[0] > b[0]
},

compareStringAscending: function(a, b) {
	return a > b
},

continueArrays: function(arrays, oldArray) {
	if (arrays.length < 1) {
		return arrays
	}

	if (oldArray == undefined) {
		oldArray = arrays[0]
	}

	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		if (!Array.isArray(arrays[arrayIndex])) {
			arrays[arrayIndex] = [arrays[arrayIndex]]
		}
		var array = arrays[arrayIndex]
		array.length = oldArray.length
		Vector.setUndefinedElementsToArray(array, oldArray)
		oldArray = array
	}

	return arrays
},

crossProduct: function(a = 0.0, b = 0.0) {
	return VectorFast.crossProduct(Vector.getArrayByElements(a, 3), Vector.getArrayByElements(b, 3))
},

crossProduct2D: function(a = 0.0, b = 0.0) {
	return VectorFast.crossProduct2D(Vector.getArrayByElements(a, 2), Vector.getArrayByElements(b, 2))
},

distance2D: function(elements = 0.0, others = 0.0) {
	return VectorFast.distance2D(Vector.getArrayByElements(elements, 2), Vector.getArrayByElements(others, 2))
},

distanceSquared2D: function(elements = 0.0, others = 0.0) {
	return VectorFast.distanceSquared2D(Vector.getArrayByElements(elements, 2), Vector.getArrayByElements(others, 2))
},

distance3D: function(elements = 0.0, others = 0.0) {
	return VectorFast.distance3D(Vector.getArrayByElements(elements, 3), Vector.getArrayByElements(others, 3))
},

distanceSquared3D: function(elements = 0.0, others = 0.0) {
	return VectorFast.distanceSquared3D(Vector.getArrayByElements(elements, 3), Vector.getArrayByElements(others, 3))
},

distanceArray: function(elements = 0.0, others = 0.0, until) {
	return VectorFast.distanceArray(Vector.getArrayByElements(elements, until), Vector.getArrayByElements(others, until))
},

distanceSquaredArray: function(elements = 0.0, others = 0.0, until) {
	return VectorFast.distanceSquaredArray(Vector.getArrayByElements(elements, until), Vector.getArrayByElements(others, until))
},

divide2D: function(elements = 0.0, divisor2D = 1.0) {
	return VectorFast.divide2D(Vector.getArrayByElements(elements, 2), Vector.getArrayByElements(divisor2D, 2, 1.0))
},

divide2DScalar: function(elements = 0.0, divisorScalar = 1.0) {
	return VectorFast.divide2DScalar(Vector.getArrayByElements(elements, 2), divisorScalar)
},

divide3D: function(elements = 0.0, divisor3D = 1.0) {
	return VectorFast.divide3D(Vector.getArrayByElements(elements, 3), Vector.getArrayByElements(divisor3D, 3, 1.0))
},

divide3DScalar: function(elements = 0.0, divisorScalar = 1.0) {
	return VectorFast.divide3DScalar(Vector.getArrayByElements(elements, 3), divisorScalar)
},

divideArray: function(elements = 0.0, divisors = 1.0, until) {
	return VectorFast.divideArray(Vector.getArrayByElements(elements, until), Vector.getArrayByElements(divisors, until, 1.0))
},

divideArrayScalar: function(elements = 0.0, divisorScalar = 1.0, until) {
	return VectorFast.divideArrayScalar(Vector.getArrayByElements(elements, until), divisorScalar)
},

dotProduct2D: function(elements = 0.0, others = 0.0) {
	return VectorFast.dotProduct2D(Vector.getArrayByElements(elements, 2), Vector.getArrayByElements(others, 2))
},

dotProduct3D: function(elements = 0.0, others = 0.0) {
	return VectorFast.dotProduct3D(Vector.getArrayByElements(elements, 3), Vector.getArrayByElements(others, 3))
},

dotProductArray: function(elements = 0.0, others = 0.0, until) {
	return VectorFast.dotProductArray(Vector.getArrayByElements(elements, until), Vector.getArrayByElements(others, until))
},

equal2D: function(elements = 0.0, others = 0.0) {
	return VectorFast.equal2D(Vector.getArrayByElements(elements, 2), Vector.getArrayByElements(others, 2))
},

equal3D: function(elements = 0.0, others = 0.0) {
	return VectorFast.equal2D(Vector.getArrayByElements(elements, 3), Vector.getArrayByElements(others, 3))
},

equalArray: function(elements = 0.0, others = 0.0, until) {
	return VectorFast.equalArray(Vector.getArrayByElements(elements, until), Vector.getArrayByElements(others, until))
},

fillRemaining: function(elements = 0.0, until = 2) {
	elements = Vector.getArrayByValue(elements)
	if (elements.length < until) {
		elements.length = until
		Vector.setUndefinedElementsToValue(elements, elements[0])
	}

	return elements
},

getAddition2D: function(elements = 0.0, adder2D = 0.0) {
	return VectorFast.getAddition2D(Vector.getArrayByElements(elements, 2), Vector.getArrayByElements(adder2D, 2))
},

getAddition3D: function(elements, adder3D) {
	return VectorFast.getAddition3D(Vector.getArrayByElements(elements, 3), Vector.getArrayByElements(adder3D, 3))
},

getAdditionArray: function(elements = 0.0, adders = 0.0, until) {
	return VectorFast.getAdditionArray(Vector.getArrayByElements(elements, until), Vector.getArrayByElements(adders, until))
},

getArrayByElements: function(elements = 0.0, until, value = 0.0) {
	var elements = Vector.getArrayByValue(elements)
	var until = Value.getValueDefault(until, elements.length)
	if (elements.length < until) {
		elements.length = until
	}

	for (var elementIndex = 0; elementIndex < until; elementIndex++) {
		elements[elementIndex] = Value.getValueDefault(elements[elementIndex], value)
	}

	return elements
},

getArrayByValue: function(value) {
	if (Array.isArray(value)) {
		return value
	}

	return [value]
},

getArrayOrUndefinedBySet: function(setForArray) {
	if (setForArray.size == 0) {
		return undefined
	}

	return Array.from(setForArray)
},

getArraysBySplittingStrings: function(strings, stringSeparator) {
	var arrays = new Array(strings.length)
	for (var stringIndex = 0; stringIndex < strings.length; stringIndex++) {
		arrays[stringIndex] = strings[stringIndex].split(stringSeparator)
	}

	return arrays
},

//use getRelativeDirection for ordering because getDirectionalProximity loses accuracy close to the x axis
getDirectionalProximity: function(a2D, b2D) {
	var dotProduct = Vector.dotProduct2D(a2D, b2D)
	if (a2D[0] * b2D[1] <= a2D[1] * b2D[0]) {
		return dotProduct
	}

	return -3.0 - dotProduct
},

getDivision2D: function(elements = 0.0, divisor2D = 1.0) {
	return VectorFast.getDivision2D(Vector.getArrayByElements(elements, 2), Vector.getArrayByElements(divisor2D, 2))
},

getDivision2DScalar: function(elements = 0.0, divisorScalar = 1.0) {
	return VectorFast.getDivision2DScalar(Vector.getArrayByElements(elements, 2), divisorScalar)
},

getDivision3D: function(elements, divisor3D) {
	return VectorFast.getDivision3D(Vector.getArrayByElements(elements, 3), Vector.getArrayByElements(divisor3D, 3, 1.0))
},

getDivision3DScalar: function(elements, divisorScalar) {
	return VectorFast.getDivision3DScalar(Vector.getArrayByElements(elements, 3), Value.getValueDefault(divisorScalar, 1.0))
},

getDivisionArray: function(elements = 0.0, divisors = 1.0, until) {
	return VectorFast.getDivisionArray(Vector.getArrayByElements(elements, until), Vector.getArrayByElements(divisors, until, 1.0))
},

getDivisionArrayScalar: function(elements = 0.0, divisorScalar = 1.0, until) {
	return VectorFast.getDivisionArrayScalar(Vector.getArrayByElements(elements, until), divisorScalar, until)
},

getFilledArray: function(value, length = 2) {
	var array = new Array(length)
	for (var arrayIndex = 0; arrayIndex < length; arrayIndex++) {
		array[arrayIndex] = value
	}

	return array
},

getInteriorAngle: function(begin, end, radius) {
	var halfDistance = 0.5 * Vector.distance2D(begin, end)
	if (halfDistance > radius) {
		printCaller(['halfDistance is greater than radius in getInteriorAngle in vector.', begin, end, radius])
	}

	return 2.0 * Math.asin(halfDistance / radius)
},

getMeldedArray: function(elements, others) {
	var elements = Vector.getArrayByValue(elements)
	var others = Vector.getArrayByValue(others)
	var meldedArray = Polyline.copy(elements)
	var weightIncrement = 1.0 / (elements.length - 1)
	var elementWeight = 1.0
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		VectorFast.multiplyArrayScalar(meldedArray[elementIndex], elementWeight)
		VectorFast.addArray(meldedArray[elementIndex], VectorFast.getMultiplicationArrayScalar(others[elementIndex], (1.0 - elementWeight)))
		elementWeight -= weightIncrement
	}

	return meldedArray
},

getMinimumLength: function(elements, others, until) {
	var minimumLength = Math.min(elements.length, others.length)
	if (until == undefined) {
		return minimumLength
	}

	return Math.min(minimumLength, until)
},

getMultiplication2D: function(elements = 0.0, multiplier2D = 1.0) {
	return VectorFast.getMultiplication2D(Vector.getArrayByElements(elements, 2), Vector.getArrayByElements(multiplier2D, 2))
},

getMultiplication2DScalar: function(elements = 0.0, multiplierScalar = 1.0) {
	return VectorFast.getMultiplication2DScalar(Vector.getArrayByElements(elements, 2), Value.getValueDefault(multiplierScalar, 0.0))
},

getMultiplication3D: function(elements = 0.0, multiplier3D = 1.0) {
	return VectorFast.getMultiplication3D(Vector.getArrayByElements(elements, 3), Vector.getArrayByElements(multiplier3D, 3))
},

getMultiplication3DScalar: function(elements = 0.0, multiplierScalar = 1.0) {
	return VectorFast.getMultiplication3DScalar(Vector.getArrayByElements(elements, 3), Value.getValueDefault(multiplierScalar, 0.0))
},

getMultiplicationArray: function(elements = 0.0, multipliers = 1.0, until) {
	return VectorFast.getMultiplicationArray(Vector.getArrayByElements(elements), Vector.getArrayByElements(multipliers), until)
},

getMultiplicationArrayScalar: function(elements = 0.0, multiplierScalar = 1.0, until) {
	return VectorFast.multiplyArrayScalar(Vector.getArrayByElements(elements), multiplierScalar, until)
},

getMultiplicationArraysScalar: function(elementArrays = 0.0, multiplierScalar = 1.0, until) {
	elementArrays = Vector.getArrayByElements(elementArrays)
	var multiplicationArrays = new Array(elementArrays.length)
	for (var elementListIndex = 0; elementListIndex < elementArrays.length; elementListIndex++) {
		multiplicationArrays[elementListIndex] = Vector.getMultiplicationArrayScalar(elementArrays[elementListIndex], multiplierScalar, until)
	}

	return multiplicationArrays
},

getNumberOfDifferences: function(arraysA, arraysB) {
	var numberOfDifferences = 0
	if (arraysA.length != arraysB.length) {
		return Math.abs(arraysA.length - arraysB.length)
	}
	for (var arrayIndex = 0; arrayIndex < arraysA.length; arrayIndex++) {
		var arrayA = arraysA[arrayIndex]
		var arrayB = arraysB[arrayIndex]
		if (arrayA.length != arrayB.length) {
			numberOfDifferences += Math.abs(arrayA.length - arrayB.length)
		}
		else {
			for (var elementIndex = 0; elementIndex < arrayA.length; elementIndex++) {
				if (arrayA[elementIndex] != arrayB[elementIndex]) {
					numberOfDifferences += 1
				}
			}
		}
	}
	return numberOfDifferences
},

getPushArray: function(elements, others) {
	if (elements == undefined) {
		return others
	}

	return Vector.pushArray(elements, others)
},

getPushElement: function(arrayToAddTo, element) {
	if (arrayToAddTo == undefined) {
		return [element]
	}

	arrayToAddTo.push(element)
	return arrayToAddTo
},

getRelativeDirection: function(vector = 1.0) {
	vector = Vector.getArrayByElements(vector, 2)
	var absoluteX = Math.abs(vector[0])
	if (vector[1] > absoluteX) {
		return 6.06 + vector[0] / vector[1]
	}

	if (vector[1] < -absoluteX) {
		return 2.02 + vector[0] / vector[1]
	}

	var absoluteY = Math.abs(vector[1])
	if (vector[0] > absoluteY) {
		return -vector[1] / vector[0]
	}

	return 4.04 -vector[1] / vector[0]
},

getRotation2DAngle: function(point = 0.0, angle = 0.0) {
	return VectorFast.getRotation2DAngle(Vector.getArrayByElements(point, 2), polar(angle))
},

getRotation2DVector: function(point = 0.0, vector = 1.0) {
	return VectorFast.getRotation2DVector(Vector.getArrayByElements(point, 2), Vector.getArrayByElements(vector, 2))
},

getRotation2DX: function(point = 0.0, vector = 1.0) {
	return VectorFast.getRotation2DX(Vector.getArrayByElements(point, 2), Vector.getArrayByElements(vector, 2))
},

getRotation2DY: function(point = 0.0, vector = 1.0) {
	return VectorFast.getRotation2DY(Vector.getArrayByElements(point, 2), Vector.getArrayByElements(vector, 2))
},

getSequence: function(length) {
	var sequence = new Array(length)
	for (var index = 0; index < length; index++) {
		sequence[index] = index
	}
	return sequence
},

getShortArrays: function(arrays, length) {
	var shortArrays = new Array(arrays.length)
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		shortArrays[arrayIndex] = arrays[arrayIndex].slice(0, length)
	}
	return shortArrays
},

getStartIndex: function(elements) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		var nextIndex = (elementIndex + 1) % elements.length
		if (elements[elementIndex] == null && elements[nextIndex] != null) {
			return nextIndex
		}
	}

	return undefined
},

getSubtraction2D: function(elements = 0.0, subtractor2D = 0.0) {
	return VectorFast.getSubtraction2D(Vector.getArrayByElements(elements, 2), Vector.getArrayByElements(subtractor2D, 2))
},

getSubtraction3D: function(elements = 0.0, subtractor3D = 0.0) {
	return VectorFast.getSubtraction3D(Vector.getArrayByElements(elements, 3), Vector.getArrayByElements(subtractor3D, 3))
},

getSubtractionArray: function(elements = 0.0, subtractors = 0.0, until) {
	return VectorFast.getSubtractionArray(Vector.getArrayByElements(elements, until), Vector.getArrayByElements(subtractors, until))
},

interpolationFromToAlong2D: function(from = 0.0, to = 1.0, along = 0.5) {
	from = Vector.getArrayByElements(from, 2)
	to = Vector.getArrayByElements(to, 2)
	return VectorFast.add2D(VectorFast.getMultiplication2DScalar(to, along), VectorFast.getMultiplication2DScalar(from, (1.0 - along)))
},

interpolationFromToAlong3D: function(from = 0.0, to = 1.0, along = 0.5) {
	from = Vector.getArrayByElements(from, 3)
	to = Vector.getArrayByElements(to, 3)
	return VectorFast.add3D(VectorFast.getMultiplication3DScalar(to, along), VectorFast.getMultiplication3DScalar(from, (1.0 - along)))
},

interpolationFromToAlongArray: function(from = 0.0, to = 1.0, along = 0.5, until) {
	from = Vector.getArrayByElements(from, until)
	to = Vector.getArrayByElements(to, until)
	var fromToAlongArray = VectorFast.getMultiplicationArrayScalar(to, along, until)
	return VectorFast.addArray(fromToAlongArray, VectorFast.getMultiplicationArrayScalar(from, (1.0 - along), until))
},

interpolationFromToDistance2D: function(from2D = 0.0, to2D = 1.0, distance = 1.0) {
	from2D = Vector.lengthenSetUndefinedElements(Vector.getArrayByValue(from2D), 2)
	to2D = Vector.lengthenSetUndefinedElements(Vector.getArrayByValue(to2D), 2)
	var fromTo = VectorFast.getSubtraction2D(to2D, from2D)
	var fromToLength = VectorFast.length2D(fromTo)
	if (fromToLength > 0.0) {
		return VectorFast.add2D(VectorFast.multiply2DScalar(fromTo, distance / fromToLength), from2D)
	}
	
	return undefined
},

interpolationFromToDistance3D: function(from3D = 0.0, to3D = 1.0, distance = 1.0) {
	from3D = Vector.lengthenSetUndefinedElements(Vector.getArrayByValue(from3D), 3)
	to3D = Vector.lengthenSetUndefinedElements(Vector.getArrayByValue(to3D), 3)
	var fromTo = VectorFast.getSubtraction3D(to3D, from3D)
	var fromToLength = VectorFast.length3D(fromTo)
	if (fromToLength > 0.0) {
		return VectorFast.add3D(VectorFast.multiply3DScalar(fromTo, distance / fromToLength), from3D)
	}
	
	return undefined
},

interpolationFromToDistanceArray: function(froms = 0.0, tos = 1.0, distance = 1.0, until) {
	froms = Vector.getArrayByValue(froms)
	tos = Vector.getArrayByValue(tos)
	var minimumLength = Vector.getMinimumLength(froms, tos, until)
	var fromTo = VectorFast.getSubtractionArray(tos, froms, until)
	var fromToLength = VectorFast.lengthArray(fromTo)
	if (fromToLength > 0.0) {
		return VectorFast.addArray(VectorFast.multiplyArrayScalar(fromTo, distance / fromToLength), froms)
	}

	return undefined
},

intervalFromToBetween: function(from = 0.0, to = 1.0, along = 0.5) {
	return Vector.intervalsFromToBetween(from, to, along)[0]
},

intervalsFromQuantityIncrement: function(from = 0.0, quantity = 11, increments = 1.0, includeFrom, includeTo) {
	increments = Vector.getArrayByValue(increments)
	if (quantity == 0) {
		printCaller(['quantity is 0 in intervalsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}

	if (increments.length == 0) {
		printCaller(['increments.length is 0 in intervalsFromQuantityIncrement in function.', from, quantity, increments])
		return [from]
	}

	if (quantity < 0.0) {
		Vector.reverseSigns(increments)
		quantity = -quantity
	}

	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		printCaller(['quantityFloor is less than 1 in intervalsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}

	var properFraction = quantity - quantityFloor
	var intervals = [from]
	if (properFraction > gClose) {
		quantityFloor += 1
	}

	var arrayIndex = intervals.length
	intervals.length = intervals.length + quantityFloor
	var increment = 0
	for (var count = 0; count < quantityFloor; count++) {
		increment = increments[count % increments.length]
		from += increment
		intervals[arrayIndex++] = from
	}

	if (properFraction > gClose) {
		intervals[intervals.length - 1] = intervals[intervals.length - 2] + properFraction * increment
	}

	return removeUnincluded(intervals, includeFrom, includeTo)
},

intervalsFromToAlong: function(from = 0.0, to = 1.0, alongs = 0.5, includeFrom, includeTo) {
	alongs = Vector.getArrayByValue(alongs)
	var difference = to - from
	var intervals = [from]
	var arrayIndex = intervals.length
	intervals.length = intervals.length + alongs.length
	for (var intervalIndex = 0; intervalIndex < alongs.length; intervalIndex++) {
		intervals[arrayIndex++] = from + alongs[intervalIndex] * difference
	}

	intervals.push(to)
	return removeUnincluded(intervals, includeFrom, includeTo)
},

intervalsFromToBetween: function(from, to, alongs) {
	return Vector.intervalsFromToAlong(from, to, alongs, false, false)
},

intervalsFromToIncrement: function(from = 0.0, to = 1.0, increments = 1.0, includeFrom, includeTo) {
	increments = Vector.getArrayByValue(increments)
	var totalLength = 0.0
	for (var increment of increments) {
		totalLength += increment
	}

	var difference = to - from
	var numberUntilEnd = Math.floor((Math.abs(difference) + gClose) / Math.abs(totalLength))
	if (numberUntilEnd == 0) {
		printCaller(['numberUntilEnd is 0 in intervalsFromToIncrement in function.', from, to, increments])
		return [from]
	}

	if (totalLength == 0.0) {
		printCaller(['totalLength is 0 in intervalsFromToIncrement in function.', from, to, increments])
		return [from]
	}

	var incrementMultiplier = difference / numberUntilEnd / totalLength
	for (var incrementIndex = 0; incrementIndex < increments.length; incrementIndex++) {
		increments[incrementIndex] *= incrementMultiplier
	}

	numberUntilEnd -= 1
	var intervals = [from]
	var arrayIndex = intervals.length
	intervals.length = intervals.length + numberUntilEnd
	for (var intervalIndex = 0; intervalIndex < numberUntilEnd; intervalIndex++) {
		for (var increment of increments) {
			from += increment
			intervals[arrayIndex++] = from
		}
	}

	intervals.push(to)
	return removeUnincluded(intervals, includeFrom, includeTo)
},

intervalsFromToQuantity: function(from = 0.0, to = 1.0, quantity = 11, includeFrom, includeTo) {
	var increment = to - from
	if (quantity < 0.0) {
		increment = -increment
		quantity = -quantity
	}

	var quantityFloor = Math.floor(quantity + gClose)
	if (quantityFloor < 1) {
		printCaller(['quantityFloor is less than 1 in stepsFromQuantityIncrement in function.', from, quantity, increments])
		return []
	}

	var properFraction = quantity - quantityFloor
	var intervals = [from]
	quantityFloor -= 1
	quantity = quantityFloor
	if (properFraction > gClose) {
		quantityFloor++
		quantity += properFraction
	}

	increment /= quantity
	var arrayIndex = intervals.length
	intervals.length = intervals.length + quantityFloor
	for (var count = 0; count < quantityFloor; count++) {
		from += increment
		intervals[arrayIndex++] = from
	}

	if (properFraction > gClose) {
		intervals[intervals.length - 1] = intervals[intervals.length - 2] + properFraction * increment
	}

	return removeUnincluded(intervals, includeFrom, includeTo)
},

isEmpty: function(array) {
	if (array == null || array == undefined) {
		return true
	}

	return array.length == 0
},

isArrayLong: function(array, minimumLength) {
	if (!Array.isArray(array)) {
		return false
	}

	return array.length >= minimumLength
},

length2D: function(elements = 0.0) {
	return VectorFast.length2D(Vector.getArrayByElements(elements, 2))
},

length3D: function(elements = 0.0) {
	return VectorFast.length3D(Vector.getArrayByElements(elements, 3))
},

lengthArray: function(elements = 0.0) {
	return VectorFast.lengthArray(Vector.getArrayByElements(elements))
},

lengthenSetUndefinedElements: function(elements, minimumLength, value) {
	if (elements.length < minimumLength) {
		elements.length = minimumLength
	}

	Vector.setUndefinedElementsToValue(elements, value)
	return elements
},

lengthSquared2D: function(elements = 0.0) {
	return VectorFast.lengthSquared2D(Vector.getArrayByElements(elements, 2))
},

lengthSquared3D: function(elements = 0.0) {
	return VectorFast.lengthSquared3D(Vector.getArrayByElements(elements, 3))
},

lengthSquaredArray: function(elements = 0.0, until) {
	elements = Vector.getArrayByValue(elements)
	var lengthSquared = 0.0
	var minimumLength = Math.min(elements.length, Value.getValueDefault(until, elements.length))
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		lengthSquared += elements[elementIndex] * elements[elementIndex]
	}

	return lengthSquared
},

linearArrayInterpolation: function(points, x, until) {
	points = Vector.getArrayByValue(points)
	var interpolationAlong = getFlatInterpolationAlongBeginEnd(x, points)
	return Vector.interpolationFromToAlongArray(interpolationAlong[1].slice(1), interpolationAlong[2].slice(1), interpolationAlong[0], until)
},

modifyObject_Private: function() {
	Vector.setPointByName.optionMap = gMapRS
},

multiply2D: function(elements = 0.0, multiplier2D = 1.0) {
	return VectorFast.multiply2D(Vector.getArrayByElements(elements, 2), Vector.getArrayByElements(multiplier2D, 2))
},

multiply2DScalar: function(elements = 0.0, multiplierScalar = 1.0) {
	return VectorFast.multiply2DScalar(Vector.getArrayByElements(elements, 2), multiplierScalar)
},

multiply3D: function(elements = 0.0, multiplier3D = 1.0) {
	return VectorFast.multiply3D(Vector.getArrayByElements(elements, 3), Vector.getArrayByElements(multiplier3D, 3))
},

multiply3DScalar: function(elements = 0.0, multiplierScalar = 1.0) {
	return VectorFast.multiply3DScalar(Vector.getArrayByElements(elements, 3), multiplierScalar)
},

multiplyArray: function(elements = 0.0, multipliers = 1.0, until) {
	return VectorFast.multiplyArray(Vector.getArrayByElements(elements, until), Vector.getArrayByElements(multipliers, until))
},

multiplyArrayScalar: function(elements = 0.0, multiplierScalar = 1.0, until) {
	return VectorFast.multiplyArrayScalar(Vector.getArrayByElements(elements, until), multiplierScalar)
},

normalize2D: function(elements) {
	elements = Vector.getArrayByElements(elements, 2)
	var elementsLength = VectorFast.length2D(elements)
	if (elementsLength > 0.0) {
		VectorFast.divide2DScalar(elements, elementsLength)
	}

	return elements
},

normalize3D: function(elements) {
	elements = Vector.getArrayByElements(elements, 3)
	var elementsLength = VectorFast.length3D(elements)
	if (elementsLength > 0.0) {
		VectorFast.divide3DScalar(elements, elementsLength)
	}

	return elements
},

normalizedFromToAlong3D: function(a3D, b3D) {
	return Vector.normalize3D(Vector.interpolationFromToAlong3D(a3D, b3D))
},

oppositeHypoteneuseAdjacent: function(hypoteneuse, otherSide) {
	var oppositeHypoteneuseAdjacentSquared = Vector.oppositeHypoteneuseAdjacentSquared(hypoteneuse, otherSide)
	if (oppositeHypoteneuseAdjacentSquared < 0.0) {
		return NaN
	}

	return Math.sqrt(oppositeHypoteneuseAdjacentSquared)
},

oppositeHypoteneuseAdjacentSquared: function(hypoteneuse = 1.0, otherSide = 0.0) {
	return hypoteneuse * hypoteneuse - otherSide * otherSide
},

overwriteArray: function(elements, sources) {
	elements.length = sources.length
	for (var sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
		elements[sourceIndex] = sources[sourceIndex]
	}
},

overwriteArraysUntil: function(elementArrays, sourceArrays, until) {
	for (var sourceArrayIndex = 0; sourceArrayIndex < sourceArrays.length; sourceArrayIndex++) {
		this.overwriteArrayUntil(elementArrays[sourceArrayIndex], sourceArrays[sourceArrayIndex], until)
	}
},

overwriteArrayUntil: function(elements, sources, until) {
	for (var sourceIndex = 0; sourceIndex < until; sourceIndex++) {
		elements[sourceIndex] = sources[sourceIndex]
	}
},

polarCounterclockwise: function(angle = 0.0) {
	return [Math.cos(angle), Math.sin(angle)]
},

polar: function(angle, radius, x = 0.0, y = 0.0) {
	var polar = Vector.polarRadius(angle * gRadiansPerDegree, radius)
	polar[0] += x
	polar[1] += y
	return polar
},

polarRadius: function(angle = 0.0, radius = 1.0) {
	return [radius * Math.cos(angle), radius * Math.sin(angle)]
},

popArray: function(elements) {
	for (var element of elements) {
		element.pop()
	}

	return elements
},

pushArray: function(elements, others) {
	if (others == undefined) {
		return elements
	}

	var elementsLength = elements.length
	var othersLength = others.length
	elements.length = elementsLength + othersLength
	for (var otherIndex = 0; otherIndex < othersLength; otherIndex++) {
		elements[elementsLength] = others[otherIndex]
		elementsLength++
	}

	return elements
},

removeClose: function(elements) {
	for (var elementIndex = elements.length - 1; elementIndex > -1; elementIndex--) {
		if (elements.length < 2) {
			return
		}
		if (Math.abs(elements[elementIndex] - elements[(elementIndex + 1) % elements.length]) < gClose) {
			elements.splice(elementIndex, 1)
		}
	}
},

removeLastEmpties: function(elements) {
	var lastIndex = elements.length - 1
	for (; lastIndex > -1; lastIndex--) {
		if (elements[lastIndex] != undefined && elements[lastIndex] != '') {
			elements.length = lastIndex + 1
			return
		}
	}

	elements.length = 0
},

removeRepeats: function(elements) {
	for (var elementIndex = elements.length - 1; elementIndex > -1; elementIndex--) {
		if (elements.length < 2) {
			return
		}
		if (elements[elementIndex] == elements[(elementIndex + 1) % elements.length]) {
			elements.splice(elementIndex, 1)
		}
	}
},

removeRepeatsAdd: function(elements, others, minimumLength) {
	Vector.removeRepeats(others)
	if (others.length >= minimumLength) {
		elements.push(others)
	}
},

removeShortArrays: function(arrays, length) {
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		if (arrays[arrayIndex] != undefined) {
			if (arrays[arrayIndex].length < length) {
				arrays[arrayIndex] = undefined
			}
		}
	}

	Vector.removeUndefineds(arrays)
},

removeUndefineds: function(elements) {
	var withoutNullLength = 0
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (elements[elementIndex] != undefined) {
			elements[withoutNullLength] = elements[elementIndex]
			withoutNullLength += 1
		}
	}

	elements.length = withoutNullLength
},

replaceElements: function(elements, find, replacement) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (elements[elementIndex] == find) {
			elements[elementIndex] = replacement
		}
	}
},

replaceAllKeys: function(map, find, replacement) {
	for (var key of map.keys()) {
		map.set(key, map.get(key).replaceAll(find, replacement))
	}
},

reverseArrays: function(elements) {
	for (var element of elements) {
		element.reverse()
	}
},

reverseSigns: function(elements = 0.0) {
	elements = Vector.getArrayByElements(elements)
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		elements[elementIndex] = -elements[elementIndex]
	}

	return elements
},

rotate2DAngle: function(point = 0.0, angle = 0.0) {
	return VectorFast.rotate2DVector(Vector.getArrayByElements(point, 2), Vector.polarCounterclockwise(angle))
},

rotate2DVector: function(point = 0.0, vector = 1.0) {
	return VectorFast.rotate2DVector(Vector.getArrayByElements(point, 2), Vector.getArrayByElements(vector, 2))
},

setArraysLength: function(arrays, length) {
	for (var array of arrays) {
		array.length = length
	}
},

setPointByName: function(registry, statement, name, x, y, z) {
	var pointArgumentsLength = arguments.length - 3
	var point = new Array(pointArgumentsLength)
	for (var argumentIndex = 0; argumentIndex < pointArgumentsLength; argumentIndex++) {
		point[argumentIndex] = arguments[argumentIndex + 3]
	}

	var variableMap = getVariableMapByStatement(statement)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			var lastPoint = points[points.length - 1]
			if (point.length < lastPoint.length) {
				point.length = lastPoint.length
			}
			Vector.setUndefinedElementsToArray(point, lastPoint)
		}
	}

	Vector.setUndefinedElementsToValue(point, 0.0)
	variableMap.set(name, point.toString())
	return point
},

setUndefinedArraysToPrevious: function(arrays) {
	if (arrays.length == 0) {
		return
	}

	var oldElements = arrays[0]
	for (var arrayIndex = 1; arrayIndex < arrays.length; arrayIndex++) {
		var elements = arrays[arrayIndex]
		Vector.setUndefinedElementsToArray(elements, oldElements)
		oldElements = elements
	}
},

setUndefinedElementsToArray: function(elements, sources) {
	for (var parameterIndex = 0; parameterIndex < elements.length; parameterIndex++) {
		elements[parameterIndex] = Value.getValueDefault(elements[parameterIndex], sources[parameterIndex])
	}
},

setUndefinedElementsToArrayZero: function(elements, sources) {
	for (var parameterIndex = 0; parameterIndex < elements.length; parameterIndex++) {
		if (elements[parameterIndex] == undefined) {
			if (sources.length > parameterIndex) {
				elements[parameterIndex] = sources[parameterIndex]
			}
			else {
				elements[parameterIndex] = 0.0
			}
		}
	}
},

setUndefinedElementsToValue: function(elements, value = 0.0) {
	for (var parameterIndex = 0; parameterIndex < elements.length; parameterIndex++) {
		elements[parameterIndex] = Value.getValueDefault(elements[parameterIndex], value)
	}
},

spliceArray: function(elements, index, others) {
	elements.length = elements.length + others.length
	elementsLengthMinus = elements.length - 1
	var fromIndex = elementsLengthMinus - others.length
	for (var toIndex = elementsLengthMinus; toIndex >= index; toIndex--) {
		elements[toIndex] = elements[fromIndex]
		fromIndex--
	}
	for (var otherIndex = 0; otherIndex < others.length; otherIndex++) {
		elements[index] = others[otherIndex]
		index++
	}
},

stepArray: function(elements = 0.0, step = 1.0, until) {
	elements = Vector.getArrayByElements(elements)
	var minimumLength = Math.min(elements.length, Value.getValueDefault(until, elements.length))
	for (var parameterIndex = 0; parameterIndex < minimumLength; parameterIndex++) {
		elements[parameterIndex] = Value.getStep(elements[parameterIndex], step)
	}

	return elements
},

subtract2D: function(elements = 0.0, subtractor2D = 0.0) {
	return VectorFast.subtract2D(Vector.getArrayByElements(elements, 2), Vector.getArrayByElements(subtractor2D, 2))
},

subtract3D: function(elements = 0.0, subtractor3D = 0.0) {
	return VectorFast.subtract3D(Vector.getArrayByElements(elements, 3), Vector.getArrayByElements(subtractor3D, 3))
},

subtractArray: function(elements = 0.0, subtractors = 0.0, until) {
	return VectorFast.subtractArray(Vector.getArrayByElements(elements, until), Vector.getArrayByElements(subtractors, until))
}
}
