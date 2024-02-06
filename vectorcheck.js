//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function add2D_Check(elements, adder2D) {
	return add2D(getArrayByElements(elements, 2), getArrayByElements(adder2D, 2))
}

function add3D_Check(elements, adder3D) {
	return add3D(getArrayByElements(elements, 3), getArrayByElements(adder3D, 3))
}

function addArray_Check(elements, adders, until) {
	return addArray(getArrayByElements(elements), getArrayByElements(adders), until)
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

function crossProduct_Check(a, b) {
	return crossProduct(getArrayByElements(a, 3), getArrayByElements(b, 3))
}

function crossProduct2D_Check(a, b) {
	return crossProduct2D(getArrayByElements(a, 2), getArrayByElements(b, 2))
}

function distance2D_Check(elements, others) {
	return distance2D(getArrayByElements(elements, 2), getArrayByElements(others, 2))
}

function distanceSquared2D_Check(elements, others) {
	return distanceSquared2D(getArrayByElements(elements, 2), getArrayByElements(others, 2))
}

function distance3D_Check(elements, others) {
	return distance3D(getArrayByElements(elements, 3), getArrayByElements(others, 3))
}


function distanceSquared3D_Check(elements, others) {
	return distanceSquared3D(getArrayByElements(elements, 3), getArrayByElements(others, 3))
}

function distanceArray_Check(elements, others, until) {
	return distanceArray(getArrayByElements(elements), getArrayByElements(others), until)
}

function distanceSquaredArray_Check(elements, others, until) {
	return distanceSquaredArray(getArrayByElements(elements), getArrayByElements(others), until)
}

function divide2D_Check(elements, divisor2D) {
	return divide2D(getArrayByElements(elements, 2), getArrayByElements(divisor2D, 2, 1.0))
}

function divide2DScalar_Check(elements, divisorScalar) {
	return divide2DScalar(getArrayByElements(elements, 2), getValueDefault(divisorScalar, 1.0))
}

function divide3D_Check(elements, divisor3D) {
	return divide3D(getArrayByElements(elements, 3), getArrayByElements(divisor3D, 3, 1.0))
}

function divide3DScalar_Check(elements, divisorScalar) {
	return divide3DScalar(getArrayByElements(elements, 3), getValueDefault(divisorScalar, 1.0))
}

function divideArray_Check(elements, divisors, until) {
	return divideArray(getArrayByElements(elements), getArrayByElements(divisors, undefined, 1.0), until)
}

function divideArrayScalar_Check(elements, divisorScalar) {
	return divideArrayScalar(getArrayByElements(elements), getValueDefault(divisorScalar, 1.0))
}

function dotProduct2D_Check(elements, others) {
	return dotProduct2D(getArrayByElements(elements, 2), getArrayByElements(others, 2))
}

function dotProduct3D_Check(elements, others) {
	return dotProduct3D(getArrayByElements(elements, 3), getArrayByElements(others, 3))
}

function dotProductArray_Check(elements, others, until) {
	return dotProductArray(getArrayByElements(elements), getArrayByElements(others), until)
}

function equal2D_Check(elements, others) {
	return equal2D(getArrayByElements(elements, 2), getArrayByElements(others, 2))
}

function equal3D_Check(elements, others) {
	return equal2D(getArrayByElements(elements, 3), getArrayByElements(others, 3))
}

function equalArray_Check(elements, others, until) {
	return equalArray(getArrayByElements(elements), getArrayByElements(others), until)
}

function getAddition2D_Check(elements, adder2D) {
	return getAddition2D(getArrayByElements(elements, 2), getArrayByElements(adder2D, 2))
}

function getAddition2Ds_Check(elements, adder2D) {
	//unfinished, needs elements arrays check
	return getAddition2Ds(elements, getArrayByElements(adder2D, 2))
}

function getAddition3D_Check(elements, adder3D) {
	return getAddition3D(getArrayByElements(elements, 3), getArrayByElements(adder3D, 3))
}

function getAdditionArray_Check(elements, adders, until) {
	return getAdditionArray(getArrayByElements(elements), getArrayByElements(adders), until)
}

function getDivision2D_Check(elements, divisor2D) {
	return getDivision2D(getArrayByElements(elements, 2), getArrayByElements(divisor2D, 2, 1.0))
}

function getDivision2DScalar_Check(elements, divisorScalar) {
	return getDivision2DScalar(getArrayByElements(elements, 2), getValueDefault(divisorScalar, 1.0))
}

function getDivision3D_Check(elements, divisor3D) {
	return getDivision3D(getArrayByElements(elements, 3), getArrayByElements(divisor3D, 3, 1.0))
}

function getDivision3DScalar_Check(elements, divisorScalar) {
	return getDivision3DScalar(getArrayByElements(elements, 3), getValueDefault(divisorScalar, 1.0))
}

function getDivisionArray_Check(elements, divisors) {
	return getDivisionArray(getArrayByElements(elements), getArrayByElements(divisors, undefined, 1.0))
}

function getDivisionArrayScalar_Check(elements, divisorScalar) {
	return divideArrayScalar(getArrayByElements(elements), getValueDefault(divisorScalar, 1.0))
}

function getMultiplication2D_Check(elements, multiplier2D) {
	return getMultiplication2D(getArrayByElements(elements, 2), getArrayByElements(multiplier2D, 2))
}

function getMultiplication2DScalar_Check(elements, multiplierScalar) {
	return getMultiplication2DScalar(getArrayByElements(elements, 2), getValueDefault(multiplierScalar, 0.0))
}

function getMultiplication3D_Check(elements, multiplier3D) {
	return getMultiplication3D(getArrayByElements(elements, 3), getArrayByElements(multiplier3D, 3))
}

function getMultiplication3DScalar_Check(elements, multiplierScalar) {
	return getMultiplication3DScalar(getArrayByElements(elements, 3), getValueDefault(multiplierScalar, 0.0))
}

function getMultiplicationArray_Check(elements, multipliers) {
	return getMultiplicationArray(getArrayByElements(elements), getArrayByElements(multipliers))
}

function getMultiplicationArrayScalar_Check(elements, multiplierScalar) {
	return multiplyArrayScalar(getArrayByElements(elements), getValueDefault(multiplierScalar, 0.0))
}

function getRotation2DAngle_Check(point, angle) {
	return getRotation2DAngle(getArrayByElements(point, 2), polar_Check(angle))
}

function getRotation2DVector_Check(point, vector) {
	return getRotation2DVector(getArrayByElements(point, 2), getArrayByElements(vector, 2))
}

function getRotation2DX_Check(point, vector) {
	return getRotation2DX(getArrayByElements(point, 2), getArrayByElements(vector, 2))
}

function getRotation2DY_Check(point, vector) {
	return getRotation2DY(getArrayByElements(point, 2), getArrayByElements(vector, 2))
}

function getSubtraction2D_Check(elements, subtractor2D) {
	return getSubtraction2D(getArrayByElements(elements, 2), getArrayByElements(subtractor2D, 2))
}

function getSubtraction3D_Check(elements, subtractor3D) {
	return getSubtraction3D(getArrayByElements(elements, 3), getArrayByElements(subtractor3D, 3))
}

function getSubtractionArray_Check(elements, subtractors) {
	return getSubtractionArray(getArrayByElements(elements), getArrayByElements(subtractors))
}

function length2D_Check(elements) {
	return length2D(getArrayByElements(elements, 2))
}

function lengthSquared2D_Check(elements) {
	return lengthSquared2D(getArrayByElements(elements, 2))
}

function length3D_Check(elements) {
	return length3D(getArrayByElements(elements, 3))
}

function lengthSquared3D_Check(elements) {
	return lengthSquared3D(getArrayByElements(elements, 3))
}

function lengthArray_Check(elements) {
	return lengthArray(getArrayByElements(elements))
}

function lengthSquaredArray_Check(elements) {
	return lengthSquaredArray(getArrayByElements(elements))
}

function multiply2D_Check(elements, multiplier2D) {
	return multiply2D(getArrayByElements(elements, 2), getArrayByElements(multiplier2D, 2))
}

function multiply2DScalar_Check(elements, multiplierScalar) {
	return multiply2DScalar(getArrayByElements(elements, 2), getValueDefault(multiplierScalar, 0.0))
}

function multiply3D_Check(elements, multiplier3D) {
	return multiply3D(getArrayByElements(elements, 3), getArrayByElements(multiplier3D, 3))
}

function multiply3DScalar_Check(elements, multiplierScalar) {
	return multiply3DScalar(getArrayByElements(elements, 3), getValueDefault(multiplierScalar, 0.0))
}

function multiplyArray_Check(elements, multipliers, until) {
	return multiplyArray(getArrayByElements(elements), getArrayByElements(multipliers), until)
}

function multiplyArrayScalar_Check(elements, multiplierScalar) {
	return multiplyArrayScalar(getArrayByElements(elements), getValueDefault(multiplierScalar, 0.0))
}

function oppositeHypoteneuseAdjacent_Check(hypoteneuse, otherSide) {
	var oppositeHypoteneuseAdjacentSquared = oppositeHypoteneuseAdjacentSquared_Check(hypoteneuse, otherSide)
	if (oppositeHypoteneuseAdjacentSquared < 0.0) {
		return 0.0
	}
	return Math.sqrt(oppositeHypoteneuseAdjacentSquared)
}

function oppositeHypoteneuseAdjacentSquared_Check(hypoteneuse, otherSide) {
	return oppositeHypoteneuseAdjacentSquared(getValueOne(otherSide), getValueDefault(otherSide, 1.0))
}

function polar_Check(angle, radius, x, y) {
	var polar = polarRadius(getValueDefault(angle, 0.0) * gRadiansPerDegree, getValueDefault(radius, 1.0))
	polar[0] += getValueDefault(x, 0.0)
	polar[1] += getValueDefault(y, 0.0)
	return polar
}

function reverseSigns_Check(elements) {
	return reverseSigns(getArrayByElements(elements))
}

function rotate2DAngle_Check(point, angle) {
	return rotate2DVector(getArrayByElements(point, 2), polar_Check(getValueDefault(angle, 0.0)))
}

function rotate2DVector_Check(point, vector) {
	return rotate2DVector(getArrayByElements(point, 2), getArrayByElements(vector, 2))
}

function subtract2D_Check(elements, subtractor2D) {
	return subtract2D(getArrayByElements(elements, 2), getArrayByElements(subtractor2D, 2))
}

function subtract3D_Check(elements, subtractor3D) {
	return subtract3D(getArrayByElements(elements, 3), getArrayByElements(subtractor3D, 3))
}

function subtractArray_Check(elements, subtractors, until) {
	return subtractArray(getArrayByElements(elements), getArrayByElements(subtractors), until)
}
