//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function add2D(elements, adder2D) {
	elements[0] += adder2D[0]
	elements[1] += adder2D[1]
	return elements
}

function add3D(elements, adder3D) {
	elements[0] += adder3D[0]
	elements[1] += adder3D[1]
	elements[2] += adder3D[2]
	return elements
}

function addArray(elements, adders, until) {
	var minimumLength = getMinimumLength(elements, adders, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] += adders[elementIndex]
	}

	return elements
}

function arrayAtIndex(elements, index) {
	var outputs = new Array(elements.length)
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		outputs[elementIndex] = elements[elementIndex][index]
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

function distanceSquared2D(elements, others) {
	return lengthSquared2D(getSubtraction2D(elements, others))
}

function distance3D(elements, others) {
	return Math.sqrt(distanceSquared3D(elements, others))
}

function distanceSquared3D(elements, others) {
	return lengthSquared3D(getSubtraction3D(elements, others))
}

function distanceArray(elements, others, until) {
	return Math.sqrt(distanceSquaredArray(elements, others, until))
}

function distanceSquaredArray(elements, others, until) {
	var distanceSquared = 0.0
	var minimumLength = getMinimumLength(elements, others, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		var distance = elements[elementIndex] - others[elementIndex]
		distanceSquared += distance * distance
	}

	return distanceSquared
}

function divide2D(elements, divisor2D) {
	elements[0] /= divisor2D[0]
	elements[1] /= divisor2D[1]
	return elements
}

function divide2DScalar(elements, divisorScalar) {
	elements[0] /= divisorScalar
	elements[1] /= divisorScalar
	return elements
}

function divide3D(elements, divisor3D) {
	elements[0] /= divisor3D[0]
	elements[1] /= divisor3D[1]
	elements[2] /= divisor3D[2]
	return elements
}

function divide3DScalar(elements, divisorScalar) {
	elements[0] /= divisorScalar
	elements[1] /= divisorScalar
	elements[2] /= divisorScalar
	return elements
}

function divideArray(elements, divisors, until) {
	var minimumLength = getMinimumLength(elements, divisors, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] /= divisors[elementIndex]
	}

	return elements
}

function divideArrayScalar(elements, divisorScalar) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		elements[elementIndex] /= divisorScalar
	}

	return elements
}

function dotProduct2D(elements, others) {
	return elements[0] * others[0] + elements[1] * others[1]
}

function dotProduct3D(elements, others) {
	return elements[0] * others[0] + elements[1] * others[1] + elements[2] * others[2]
}

function dotProductArray(elements, others, until) {
	var dotProduct = 0.0
	var minimumLength = getMinimumLength(elements, others, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		dotProduct += elements[elementIndex] * others[elementIndex]
	}

	return dotProduct
}

function equal2D(elements, others) {
	return elements[0] == others[0] && elements[1] == others[1]
}

function equal3D(elements, others) {
	return elements[0] == others[0] && elements[1] == others[1] && elements[2] == others[2]
}

function equalArray(elements, others, until) {
	var minimumLength = getMinimumLength(elements, others, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		if (elements[elementIndex] != others[elementIndex]) {
			return false
		}
	}

	return true
}

function getAddition2D(elements, adder2D) {
	return add2D(elements.slice(0), adder2D)
}

function getAddition2Ds(elements, adder2D) {
	var addition2Ds = new Array(elements.length)
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		addition2Ds[elementIndex] = getAddition2D(elements[elementIndex], adder2D)
	}

	return addition2Ds
}

function getAddition3D(elements, adder3D) {
	return add3D(elements.slice(0), adder3D)
}

function getAdditionArray(elements, adders, until) {
	return addArray(elements.slice(0), adders, until)
}

function getDivision2D(elements, divisor2D) {
	return divide2D(elements.slice(0), divisor2D)
}

function getDivision2DScalar(elements, divisorScalar) {
	return divide2DScalar(elements.slice(0), divisorScalar)
}

function getDivision3D(elements, divisor3D) {
	return divide3D(elements.slice(0), divisor3D)
}

function getDivision3DScalar(elements, divisorScalar) {
	return divide3DScalar(elements.slice(0), divisorScalar)
}

function getDivisionArray(elements, divisors) {
	return divideArray(elements.slice(0), divisors)
}

function getDivisionArrayScalar(elements, divisorScalar) {
	return divideArrayScalar(elements.slice(0), divisorScalar)
}

function getMinimumLength(elements, others, until) {
	var minimumLength = Math.min(elements.length, others.length)
	if (until == undefined) {
		return minimumLength
	}

	return Math.min(minimumLength, until)
}

function getMultiplication2D(elements, multiplier2D) {
	return multiply2D(elements.slice(0), multiplier2D)
}

function getMultiplication2DScalar(elements, multiplierScalar) {
	return multiply2DScalar(elements.slice(0), multiplierScalar)
}

function getMultiplication3D(elements, multiplier3D) {
	return multiply3D(elements.slice(0), multiplier3D)
}

function getMultiplication3DScalar(elements, multiplierScalar) {
	return multiply3DScalar(elements.slice(0), multiplierScalar)
}

function getMultiplicationArray(elements, multipliers) {
	return multiplyArray(elements.slice(0), multipliers)
}

function getMultiplicationArrayScalar(elements, multiplierScalar) {
	return multiplyArrayScalar(elements.slice(0), multiplierScalar)
}

function getRotation2DAngle(point, angle) {
	return rotate2DVector(getArrayByElements(point.slice(0), 2), polarCounterclockwise(angle))
}

function getRotation2DVector(point, vector) {
	return rotate2DVector(point.slice(0), vector)
}

function getRotation2DX(point, vector) {
	return point[0] * vector[0] - point[1] * vector[1]
}

function getRotation2DY(point, vector) {
	return point[0] * vector[1] + point[1] * vector[0]
}

function getSubtraction2D(elements, subtractor2D) {
	return subtract2D(elements.slice(0), subtractor2D)
}

function getSubtraction3D(elements, subtractor3D) {
	return subtract3D(elements.slice(0), subtractor3D)
}

function getSubtractionArray(elements, subtractors) {
	return subtractArray(elements.slice(0), subtractors)
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

function multiply2DScalar(elements, multiplierScalar) {
	elements[0] *= multiplierScalar
	elements[1] *= multiplierScalar
	return elements
}

function multiply3D(elements, multiplier3D) {
	elements[0] *= multiplier3D[0]
	elements[1] *= multiplier3D[1]
	elements[2] *= multiplier3D[2]
	return elements
}

function multiply3DScalar(elements, multiplierScalar) {
	elements[0] *= multiplierScalar
	elements[1] *= multiplierScalar
	elements[2] *= multiplierScalar
	return elements
}

function multiplyArray(elements, multipliers, until) {
	var minimumLength = getMinimumLength(elements, multipliers, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] *= multipliers[elementIndex]
	}

	return elements
}

function multiplyArrayScalar(elements, multiplierScalar) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		elements[elementIndex] *= multiplierScalar
	}

	return elements
}

function oppositeHypoteneuseAdjacent(hypoteneuse, otherSide) {
	return Math.sqrt(oppositeHypoteneuseAdjacentSquared(hypoteneuse, otherSide))
}

function oppositeHypoteneuseAdjacentSquared(hypoteneuse, otherSide) {
	return hypoteneuse * hypoteneuse - otherSide * otherSide
}

function polarCounterclockwise(angle) {
	return [Math.cos(angle), Math.sin(angle)]
}

function polarRadius(angle, radius) {
	return [radius * Math.cos(angle), radius * Math.sin(angle)]
}

function reverseSigns(elements) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		elements[elementIndex] = -elements[elementIndex]
	}

	return elements
}

function rotate2DAngle(point, angle) {
	return rotate2DVector(getArrayByElements(point, 2), polarCounterclockwise(angle))
}

function rotate2DVector(point, vector) {
	var x = point[0] * vector[0] - point[1] * vector[1]
	point[1] = point[0] * vector[1] + point[1] * vector[0]
	point[0] = x
	return point
}

function subtract2D(elements, subtractor2D) {
	elements[0] -= subtractor2D[0]
	elements[1] -= subtractor2D[1]
	return elements
}

function subtract3D(elements, subtractor3D) {
	elements[0] -= subtractor3D[0]
	elements[1] -= subtractor3D[1]
	elements[2] -= subtractor3D[2]
	return elements
}

function subtractArray(elements, subtractors, until) {
	var minimumLength = getMinimumLength(elements, subtractors, until)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		elements[elementIndex] -= subtractors[elementIndex]
	}

	return elements
}
