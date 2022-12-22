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

function addArray(elements, adders, until) {
	var minimumLength = Math.min(elements.length, adders.length)
	if (until != undefined) {
		minimumLength = Math.min(minimumLength, until)
	}
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] += adders[elementIndex]
	}
	return elements
}

function addArray_Check(elements, adders, until) {
	return addArray(getArrayByElements(elements), getArrayByElements(adders), until)
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
}

//cross(A, B) = [ a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1 ]
function crossProduct(a, b) {
	return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function crossProduct_Check(a, b) {
	return crossProduct(getArrayByElements(a, 3), getArrayByElements(b, 3))
}

//cross(A, B) = [ a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1 ]
function crossProduct2D(a, b) {
	return a[0] * b[1] - a[1] * b[0]
}

function crossProduct2D_Check(a, b) {
	return crossProduct2D(getArrayByElements(a, 2), getArrayByElements(b, 2))
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

function distanceArray(elements, others, until) {
	return Math.sqrt(distanceSquaredArray(elements, others, until))
}

function distanceArray_Check(elements, others, until) {
	return distanceArray(getArrayByElements(elements), getArrayByElements(others), until)
}

function distanceSquaredArray(elements, others, until) {
	var distanceSquared = 0.0
	var minimumLength = Math.min(elements.length, others.length)
	if (until != undefined) {
		minimumLength = Math.min(minimumLength, until)
	}
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		var distance = elements[elementIndex] - others[elementIndex]
		distanceSquared += distance * distance
	}
	return distanceSquared
}

function distanceSquaredArray_Check(elements, others, until) {
	return distanceSquaredArray(getArrayByElements(elements), getArrayByElements(others), until)
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

function divideArray(elements, divisors, until) {
	var minimumLength = Math.min(elements.length, divisors.length)
	if (until != undefined) {
		minimumLength = Math.min(minimumLength, until)
	}
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] /= divisors[elementIndex]
	}
	return elements
}

function divideArray_Check(elements, divisors, until) {
	return divideArray(getArrayByElements(elements), getArrayByElements(divisors, undefined, 1.0), until)
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

function dotProductArray(elements, others, until) {
	var dotProduct = 0.0
	var minimumLength = Math.min(elements.length, others.length)
	if (until != undefined) {
		minimumLength = Math.min(minimumLength, until)
	}
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		dotProduct += elements[elementIndex] * others[elementIndex]
	}
	return dotProduct
}

function dotProductArray_Check(elements, others, until) {
	return dotProductArray(getArrayByElements(elements), getArrayByElements(others), until)
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

function getAdditionArray(elements, adders, until) {
	return addArray(elements.slice(0), adders, until)
}

function getAdditionArray_Check(elements, adders, until) {
	return getAdditionArray(getArrayByElements(elements), getArrayByElements(adders), until)
}

function getDivision2D(elements, divisor2D) {
	return [elements[0] / divisor2D[0], elements[1] / divisor2D[1]]
}

function getDivision2D_Check(elements, divisor2D) {
	return getDivision2D(getArrayByElements(elements, 2), getArrayByElements(divisor2D, 2, 1.0))
}

function getDivision2DScalar(elements, divisorScalar) {
	return [elements[0] / divisorScalar, elements[1] / divisorScalar]
}

function getDivision2DScalar_Check(elements, divisorScalar) {
	return getDivision2DScalar(getArrayByElements(elements, 2), getValueByDefault(1.0, divisorScalar))
}

function getDivision3D(elements, divisor3D) {
	return [elements[0] / divisor3D[0], elements[1] / divisor3D[1], elements[2] / divisor3D[2]]
}

function getDivision3D_Check(elements, divisor3D) {
	return getDivision3D(getArrayByElements(elements, 3), getArrayByElements(divisor3D, 3, 1.0))
}

function getDivision3DScalar(elements, divisorScalar) {
	return [elements[0] / divisorScalar, elements[1] / divisorScalar, elements[2] / divisorScalar]
}

function getDivision3DScalar_Check(elements, divisorScalar) {
	return getDivision3DScalar(getArrayByElements(elements, 3), getValueByDefault(1.0, divisorScalar))
}

function getDivisionArray(elements, divisors) {
	return divideArray(elements.slice(0), divisors)
}

function getDivisionArray_Check(elements, divisors) {
	return getDivisionArray(getArrayByElements(elements), getArrayByElements(divisors, undefined, 1.0))
}

function getDivisionArrayScalar(elements, divisorScalar) {
	return divideArrayScalar(elements.slice(0), divisorScalar)
}

function getDivisionArrayScalar_Check(elements, divisorScalar) {
	return divideArrayScalar(getArrayByElements(elements), getValueByDefault(1.0, divisorScalar))
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

function getMultiplicationArrayScalar_Check(elements, multiplierScalar) {
	return multiplyArrayScalar(getArrayByElements(elements), getValueByDefault(0.0, multiplierScalar))
}

function getRotation2DAngle(point, angle) {
	return getRotation2DVector(point, polarCounterclockwise(angle))
}

function getRotation2DAngle_Check(point, angle) {
	return getRotation2DAngle(getArrayByElements(point, 2), polar_Check(angle))
}

function getRotation2DVector(point, vector) {
	return [point[0] * vector[0] - point[1] * vector[1], point[0] * vector[1] + point[1] * vector[0]]
}

function getRotation2DVector_Check(point, vector) {
	return getRotation2DVector(getArrayByElements(point, 2), getArrayByElements(vector, 2))
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

function length2D_Check(elements) {
	return length2D(getArrayByElements(elements, 2))
}

function lengthSquared2D(elements) {
	return elements[0] * elements[0] + elements[1] * elements[1]
}

function lengthSquared2D_Check(elements) {
	return lengthSquared2D(getArrayByElements(elements, 2))
}

function length3D(elements) {
	return Math.sqrt(lengthSquared3D(elements))
}

function length3D_Check(elements) {
	return length3D(getArrayByElements(elements, 3))
}

function lengthSquared3D(elements) {
	return elements[0] * elements[0] + elements[1] * elements[1] + elements[2] * elements[2]
}

function lengthSquared3D_Check(elements) {
	return lengthSquared3D(getArrayByElements(elements, 3))
}

function lengthArray(elements) {
	return Math.sqrt(lengthSquaredArray(elements))
}

function lengthArray_Check(elements) {
	return lengthArray(getArrayByElements(elements))
}

function lengthSquaredArray(elements) {
	var lengthSquared = 0.0
	for (var element of elements) {
		lengthSquared += element * element
	}
	return lengthSquared
}

function lengthSquaredArray_Check(elements) {
	return lengthSquaredArray(getArrayByElements(elements))
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

function multiplyArray(elements, multipliers, until) {
	var minimumLength = Math.min(elements.length, multipliers.length)
	if (until != undefined) {
		minimumLength = Math.min(minimumLength, until)
	}
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] *= multipliers[elementIndex]
	}
	return elements
}

function multiplyArray_Check(elements, multipliers, until) {
	return multiplyArray(getArrayByElements(elements), getArrayByElements(multipliers), until)
}

function multiplyArrayScalar(elements, multiplierScalar) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		elements[elementIndex] *= multiplierScalar
	}
	return elements
}

function multiplyArrayScalar_Check(elements, multiplierScalar) {
	return multiplyArrayScalar(getArrayByElements(elements), getValueByDefault(0.0, multiplierScalar))
}

function polar_Check(angle, radius) {
	return polarRadius(getValueByDefault(0.0, angle) * gRadiansPerDegree, getValueByDefault(1.0, radius))
}

function polarCounterclockwise(angle) {
	return [Math.cos(angle), Math.sin(angle)]
}

function polarRadius(angle, radius) {
	return [radius * Math.cos(angle), radius * Math.sin(angle)]
}

function rotate2DAngle(point, angle) {
	return rotate2DVector(getArrayByElements(point, 2), polarCounterclockwise(angle))
}

function rotate2DAngle_Check(point, angle) {
	return rotate2DVector(getArrayByElements(point, 2), polar_Check(getValueByDefault(0.0, angle)))
}

function rotate2DVector(point, vector) {
	var x = point[0] * vector[0] - point[1] * vector[1]
	point[1] = point[0] * vector[1] + point[1] * vector[0]
	point[0] = x
	return point
}

function rotate2DVector_Check(point, vector) {
	return rotate2DVector(getArrayByElements(point, 2), getArrayByElements(vector, 2))
}

function sideHypoteneuse(hypoteneuse, otherSide) {
	return Math.sqrt(sideHypoteneuseSquared(hypoteneuse, otherSide))
}

function sideHypoteneuse_Check(hypoteneuse, otherSide) {
	var sideHypoteneuseSquared = sideHypoteneuseSquared_Check(hypoteneuse, otherSide)
	if (sideHypoteneuseSquared < 0.0) {
		return 0.0
	}
	return Math.sqrt(sideHypoteneuseSquared)
}

function sideHypoteneuseSquared(hypoteneuse, otherSide) {
	return hypoteneuse * hypoteneuse - otherSide * otherSide
}

function sideHypoteneuseSquared_Check(hypoteneuse, otherSide) {
	return sideHypoteneuseSquared(getValueByDefault(1.0, otherSide), getValueByDefault(0.0, otherSide))
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

function subtractArray(elements, subtractors, until) {
	var minimumLength = Math.min(elements.length, subtractors.length)
	if (until != undefined) {
		minimumLength = Math.min(minimumLength, until)
	}
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] -= subtractors[elementIndex]
	}
	return elements
}

function subtractArray_Check(elements, subtractors, until) {
	return subtractArray(getArrayByElements(elements), getArrayByElements(subtractors), until)
}
