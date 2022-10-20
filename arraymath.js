//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function add2D(elements, adder2D) {
	elements[0] += adder2D[0]
	elements[1] += adder2D[1]
	return elements
}

function add2D_Check(elements, adder2D) {
	return add2D(getArrayByElements(elements, 2), getArrayByElements(adder2D, 2))
}

function add3D(elements, adder3D) {
	elements[0] += adder3D[0]
	elements[1] += adder3D[1]
	elements[2] += adder3D[2]
	return elements
}

function add3D_Check(elements, adder3D) {
	return add3D(getArrayByElements(elements, 3), getArrayByElements(adder3D, 3))
}

function addArray(elements, adders) {
	var minimumLength = Math.min(elements.length, adders.length)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] += adders[elementIndex]
	}
	return elements
}

function addArray_Check(elements, adders) {
	return addArray(getArrayByElements(elements), getArrayByElements(adders))
}

function arrayAtIndex(elements, index) {
	var outputs = new Array(elements.length)
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		outputs[elementIndex] = elements[elementIndex][index]
	}
	return outputs
}

function arrayAtIndex_Check(elements, index) {
	if (!Array.isArray(elements)) {
		return elements
	}
	var outputs = new Array(elements.length)
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		var element = elements[elementIndex]
		if (Array.isArray(element)) {
			if (element.length == 0) {
				element = undefined
			}
			else {
				element = element[(index + element.length) % element.length]
			}
		}
		else {
			element = undefined
		}
		outputs[elementIndex] = element
	}
	return outputs
}

//cross(A, B) = [ a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1 ]
function crossProduct(a, b) {
	return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

//cross(A, B) = [ a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1 ]
function crossProduct2D(a, b) {
	return a[0] * b[1] - a[1] * b[0]
}

function distance2D(elements, others) {
	return Math.sqrt(distanceSquared2D(elements, others))
}

function distance2D_Check(elements, others) {
	return distance2D(getArrayByElements(elements, 2), getArrayByElements(others, 2))
}

function distanceSquared2D(elements, others) {
	return lengthSquared2D(getSubtraction2D(elements, others))
}

function distanceSquared2D_Check(elements, others) {
	return distanceSquared2D(getArrayByElements(elements, 2), getArrayByElements(others, 2))
}

function distance3D(elements, others) {
	return Math.sqrt(distanceSquared3D(elements, others))
}

function distance3D_Check(elements, others) {
	return distance3D(getArrayByElements(elements, 3), getArrayByElements(others, 3))
}

function distanceSquared3D(elements, others) {
	return lengthSquared3D(getSubtraction3D(elements, others))
}

function distanceSquared3D_Check(elements, others) {
	return distanceSquared3D(getArrayByElements(elements, 3), getArrayByElements(others, 3))
}

function distanceArray(elements, others) {
	return Math.sqrt(distanceSquaredArray(elements, others))
}

function distanceArray_Check(elements, others) {
	return distanceArray(getArrayByElements(elements), getArrayByElements(others))
}

function distanceSquaredArray(elements, others) {
	var distanceSquared = 0.0
	var minimumLength = Math.min(elements.length, others.length)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		var distance = elements[elementIndex] - others[elementIndex]
		distanceSquared += distance * distance
	}
	return distanceSquared
}

function distanceSquaredArray_Check(elements, others) {
	return distanceSquaredArray(getArrayByElements(elements), getArrayByElements(others))
}

function divide2D(elements, divisor2D) {
	elements[0] /= divisor2D[0]
	elements[1] /= divisor2D[1]
	return elements
}

function divide2D_Check(elements, divisor2D) {
	return divide2D(getArrayByElements(elements, 2), getArrayByElements(divisor2D, 2, 1.0))
}

function divide2DScalar(elements, divisorScalar) {
	elements[0] /= divisorScalar
	elements[1] /= divisorScalar
	return elements
}

function divide2DScalar_Check(elements, divisorScalar) {
	return divide2DScalar(getArrayByElements(elements, 2), getValueByDefault(1.0, divisorScalar))
}

function divide3D(elements, divisor3D) {
	elements[0] /= divisor3D[0]
	elements[1] /= divisor3D[1]
	elements[2] /= divisor3D[2]
	return elements
}

function divide3D_Check(elements, divisor3D) {
	return divide3D(getArrayByElements(elements, 3), getArrayByElements(divisor3D, 3, 1.0))
}

function divide3DScalar(elements, divisorScalar) {
	elements[0] /= divisorScalar
	elements[1] /= divisorScalar
	elements[2] /= divisorScalar
	return elements
}

function divide3DScalar_Check(elements, divisorScalar) {
	return divide3DScalar(getArrayByElements(elements, 3), getValueByDefault(1.0, divisorScalar))
}

function divideArray(elements, divisors) {
	var minimumLength = Math.min(elements.length, divisors.length)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] /= divisors[elementIndex]
	}
	return elements
}

function divideArray_Check(elements, divisors) {
	return divideArray(getArrayByElements(elements), getArrayByElements(divisors, undefined, 1.0))
}

function divideArrayScalar(elements, divisorScalar) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		elements[elementIndex] /= divisorScalar
	}
	return elements
}

function divideArrayScalar_Check(elements, divisorScalar) {
	return divideArrayScalar(getArrayByElements(elements), getValueByDefault(1.0, divisorScalar))
}

function dotProduct2D(elements, others) {
	return elements[0] * others[0] + elements[1] * others[1]
}

function dotProduct2D_Check(elements, others) {
	return dotProduct2D(getArrayByElements(elements, 2), getArrayByElements(others, 2))
}

function dotProduct3D(elements, others) {
	return elements[0] * others[0] + elements[1] * others[1] + elements[2] * others[2]
}

function dotProduct3D_Check(elements, others) {
	return dotProduct3D(getArrayByElements(elements, 3), getArrayByElements(others, 3))
}

function dotProductArray(elements, others) {
	var dotProduct = 0.0
	var minimumLength = Math.min(elements.length, others.length)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		dotProduct += elements[elementIndex] * others[elementIndex]
	}
	return dotProduct
}

function dotProductArray_Check(elements, others) {
	return dotProductArray(getArrayByElements(elements), getArrayByElements(others))
}

function getAddition2D(elements, adder2D) {
	return [elements[0] + adder2D[0], elements[1] + adder2D[1]]
}

function getAddition2D_Check(elements, adder2D) {
	return getAddition2D(getArrayByElements(elements, 2), getArrayByElements(adder2D, 2))
}

function getAddition3D(elements, adder3D) {
	return [elements[0] + adder3D[0], elements[1] + adder3D[1], elements[2] + adder3D[2]]
}

function getAddition3D_Check(elements, adder3D) {
	return getAddition3D(getArrayByElements(elements, 3), getArrayByElements(adder3D, 3))
}

function getAdditionArray(elements, adders) {
	return addArray(elements.slice(0), adders)
}

function getAdditionArray_Check(elements, adders) {
	return getAdditionArray(getArrayByElements(elements), getArrayByElements(adders))
}

function getDivision2D(elements, divisor2D) {
	return [elements[0] / divisor2D[0], elements[1] / divisor2D[1]]
}

function getDivision2DScalar(elements, divisorScalar) {
	return [elements[0] / divisorScalar, elements[1] / divisorScalar]
}

function getDivision3D(elements, divisor3D) {
	return [elements[0] / divisor3D[0], elements[1] / divisor3D[1], elements[2] / divisor3D[2]]
}

function getDivision3DScalar(elements, divisorScalar) {
	return [elements[0] / divisorScalar, elements[1] / divisorScalar, elements[2] / divisorScalar]
}

function getDivisionArray(elements, divisors) {
	return divideArray(elements.slice(0), divisors)
}

function getDivisionArrayScalar(elements, divisorScalar) {
	return divideArrayScalar(elements.slice(0), divisors)
}

function getMultiplication2D(elements, multiplier2D) {
	return [elements[0] * multiplier2D[0], elements[1] * multiplier2D[1]]
}

function getMultiplication2D_Check(elements, multiplier2D) {
	return getMultiplication2D(getArrayByElements(elements, 2), getArrayByElements(multiplier2D, 2))
}

function getMultiplication2DScalar(elements, multiplierScalar) {
	return [elements[0] * multiplierScalar, elements[1] * multiplierScalar]
}

function getMultiplication2DScalar_Check(elements, multiplierScalar) {
	return getMultiplication2DScalar(getArrayByElements(elements, 2), getValueByDefault(0.0, multiplierScalar))
}

function getMultiplication3D(elements, multiplier3D) {
	return [elements[0] * multiplier3D[0], elements[1] * multiplier3D[1], elements[2] * multiplier3D[2]]
}

function getMultiplication3D_Check(elements, multiplier3D) {
	return getMultiplication3D(getArrayByElements(elements, 3), getArrayByElements(multiplier3D, 3))
}

function getMultiplication3DScalar(elements, multiplierScalar) {
	return [elements[0] * multiplierScalar, elements[1] * multiplierScalar, elements[2] * multiplierScalar]
}

function getMultiplication3DScalar_Check(elements, multiplierScalar) {
	return getMultiplication3DScalar(getArrayByElements(elements, 3), getValueByDefault(0.0, multiplierScalar))
}

function getMultiplicationArray(elements, multipliers) {
	return multiplyArray(elements.slice(0), multipliers)
}

function getMultiplicationArray_Check(elements, multipliers) {
	return getMultiplicationArray(getArrayByElements(elements), getArrayByElements(multipliers))
}

function getMultiplicationArrayScalar(elements, multiplierScalar) {
	return multiplyArrayScalar(elements.slice(0), multiplierScalar)
}

function getMultiplicationArray_Check(elements, multipliers) {
	return getMultiplicationArray(getArrayByElements(elements), getValueByDefault(0.0, multiplierScalar))
}

function getPolar(angle) {
	return [Math.cos(angle), -Math.sin(angle)]
}

function getPolarRadius(angle, radius) {
	return [radius * Math.cos(angle), radius * -Math.sin(angle)]
}

function getSubtraction2D(elements, subtractor2D) {
	return [elements[0] - subtractor2D[0], elements[1] - subtractor2D[1]]
}

function getSubtraction2D_Check(elements, subtractor2D) {
	return getSubtraction2D(getArrayByElements(elements, 2), getArrayByElements(subtractor2D, 2))
}

function getSubtraction3D(elements, subtractor3D) {
	return [elements[0] - subtractor3D[0], elements[1] - subtractor3D[1], elements[2] - subtractor3D[2]]
}

function getSubtraction3D_Check(elements, subtractor3D) {
	return getSubtraction3D(getArrayByElements(elements, 3), getArrayByElements(subtractor3D, 3))
}

function getSubtractionArray(elements, subtractors) {
	return subtractArray(elements.slice(0), subtractors)
}

function getSubtractionArray_Check(elements, subtractors) {
	return getSubtractionArray(getArrayByElements(elements), getArrayByElements(subtractors))
}

function length2D(elements) {
	return Math.sqrt(lengthSquared2D(elements))
}

function lengthSquared2D(elements) {
	return elements[0] * elements[0] + elements[1] * elements[1]
}

function length3D(elements) {
	return Math.sqrt(lengthSquared3D(elements))
}

function lengthSquared3D(elements) {
	return elements[0] * elements[0] + elements[1] * elements[1] + elements[2] * elements[2]
}

function lengthArray(elements) {
	return Math.sqrt(lengthSquaredArray(elements))
}

function lengthSquaredArray(elements) {
	var lengthSquared = 0.0
	for (var element of elements) {
		lengthSquared += element * element
	}
	return lengthSquared
}

function multiply2D(elements, multiplier2D) {
	elements[0] *= multiplier2D[0]
	elements[1] *= multiplier2D[1]
	return elements
}

function multiply2D_Check(elements, multiplier2D) {
	return multiply2D(getArrayByElements(elements, 2), getArrayByElements(multiplier2D, 2))
}

function multiply2DScalar(elements, multiplierScalar) {
	elements[0] *= multiplierScalar
	elements[1] *= multiplierScalar
	return elements
}

function multiply2DScalar_Check(elements, multiplierScalar) {
	return multiply2DScalar(getArrayByElements(elements, 2), getValueByDefault(0.0, multiplierScalar))
}

function multiply3D(elements, multiplier3D) {
	elements[0] *= multiplier3D[0]
	elements[1] *= multiplier3D[1]
	elements[2] *= multiplier3D[2]
	return elements
}

function multiply3D_Check(elements, multiplier3D) {
	return multiply3D(getArrayByElements(elements, 3), getArrayByElements(multiplier3D, 3))
}

function multiply3DScalar(elements, multiplierScalar) {
	elements[0] *= multiplierScalar
	elements[1] *= multiplierScalar
	elements[2] *= multiplierScalar
	return elements
}

function multiply3DScalar_Check(elements, multiplierScalar) {
	return multiply3DScalar(getArrayByElements(elements, 3), getValueByDefault(0.0, multiplierScalar))
}

function multiplyArray(elements, multipliers) {
	var minimumLength = Math.min(elements.length, multipliers.length)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] *= multipliers[elementIndex]
	}
	return elements
}

function multiplyArray_Check(elements, multipliers) {
	return multiplyArray(getArrayByElements(elements), getArrayByElements(multipliers))
}

function multiplyArrayScalar(elements, multiplierScalar) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		elements[elementIndex] *= multiplierScalar
	}
	return elements
}

function multiplyArrayScalar_Check(elements, multipliers) {
	return multiplyArrayScalar(getArrayByElements(elements), getValueByDefault(0.0, multiplierScalar))
}

function subtract2D(elements, subtractor2D) {
	elements[0] -= subtractor2D[0]
	elements[1] -= subtractor2D[1]
	return elements
}

function subtract2D_Check(elements, subtractor2D) {
	return subtract2D(getArrayByElements(elements, 2), getArrayByElements(subtractor2D, 2))
}

function subtract3D(elements, subtractor3D) {
	elements[0] -= subtractor3D[0]
	elements[1] -= subtractor3D[1]
	elements[2] -= subtractor3D[2]
	return elements
}

function subtract3D_Check(elements, subtractor3D) {
	return subtract3D(getArrayByElements(elements, 3), getArrayByElements(subtractor3D, 3))
}

function subtractArray(elements, subtractors) {
	var minimumLength = Math.min(elements.length, subtractors.length)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] -= subtractors[elementIndex]
	}
	return elements
}

function subtractArray_Check(elements, subtractors) {
	return subtractArray(getArrayByElements(elements), getArrayByElements(subtractors))
}
