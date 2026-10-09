import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiCheck, FiClock, FiCoffee, FiEdit3, FiPlus, FiShoppingBag, FiSun, FiSunset, FiTrash2, FiX } from "react-icons/fi";
import ConfirmDialog from "../confirmDialog";
import styles from "./styles.module.css";

const recipesKey = "tableful-recipes";
const planKey = "tableful-week-plan";
const checkedKey = "tableful-shopping-checked";
const slotNames = ["breakfast", "lunch", "dinner", "snack"];
const slotIcons = { breakfast: FiCoffee, lunch: FiSun, dinner: FiSunset, snack: FiShoppingBag };
const mealTypes = ["All recipes", "Breakfast", "Lunch", "Dinner", "Snack"];
const initialRecipes = [
    { id: "berry-oats", name: "Blueberry overnight oats", type: "Breakfast", calories: 360, minutes: 10, color: "lilac", ingredients: ["rolled oats", "blueberries", "Greek yogurt", "chia seeds", "maple syrup"] },
    { id: "avocado-toast", name: "Avocado & egg toast", type: "Breakfast", calories: 420, minutes: 15, color: "green", ingredients: ["sourdough bread", "avocado", "eggs", "lemon", "chili flakes"] },
    { id: "yogurt-bowl", name: "Honey yogurt bowl", type: "Breakfast", calories: 310, minutes: 5, color: "peach", ingredients: ["Greek yogurt", "granola", "strawberries", "honey"] },
    { id: "rainbow-bowl", name: "Rainbow grain bowl", type: "Lunch", calories: 540, minutes: 25, color: "yellow", ingredients: ["quinoa", "chickpeas", "cucumber", "cherry tomatoes", "tahini", "spinach"] },
    { id: "green-salad", name: "Green goddess salad", type: "Lunch", calories: 465, minutes: 20, color: "green", ingredients: ["spinach", "cucumber", "avocado", "chickpeas", "feta", "lemon"] },
    { id: "tomato-soup", name: "Tomato & white bean soup", type: "Lunch", calories: 490, minutes: 30, color: "peach", ingredients: ["cannellini beans", "crushed tomatoes", "vegetable stock", "onion", "basil"] },
    { id: "lemon-salmon", name: "Lemon herb salmon", type: "Dinner", calories: 620, minutes: 30, color: "blue", ingredients: ["salmon fillets", "potatoes", "green beans", "lemon", "dill"] },
    { id: "crispy-tacos", name: "Crispy black bean tacos", type: "Dinner", calories: 570, minutes: 25, color: "yellow", ingredients: ["black beans", "corn tortillas", "red cabbage", "avocado", "lime", "cumin"] },
    { id: "pesto-pasta", name: "Pesto garden pasta", type: "Dinner", calories: 590, minutes: 25, color: "green", ingredients: ["whole wheat pasta", "basil pesto", "cherry tomatoes", "parmesan", "spinach"] },
    { id: "apple-snack", name: "Apple & almond butter", type: "Snack", calories: 210, minutes: 3, color: "peach", ingredients: ["apples", "almond butter"] },
];

const readStorage = (key, fallback) => {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; }
};
const isoDate = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
const fromISO = (value) => new Date(value + "T12:00:00");
const shiftDate = (value, amount) => { const date = fromISO(value); date.setDate(date.getDate() + amount); return isoDate(date); };
const mondayOf = (value) => { const date = fromISO(value); date.setDate(date.getDate() - (date.getDay() + 6) % 7); return isoDate(date); };
const formatDay = (value, options) => new Intl.DateTimeFormat("en", options).format(fromISO(value));
const buildSamplePlan = () => {
    const start = mondayOf(isoDate(new Date()));
    const lineup = [
        ["berry-oats", "rainbow-bowl", "lemon-salmon", "apple-snack"],
        ["avocado-toast", "green-salad", "crispy-tacos", ""],
        ["yogurt-bowl", "tomato-soup", "pesto-pasta", "apple-snack"],
        ["berry-oats", "green-salad", "lemon-salmon", ""],
        ["avocado-toast", "rainbow-bowl", "crispy-tacos", "apple-snack"],
        ["berry-oats", "tomato-soup", "pesto-pasta", "apple-snack"],
        ["yogurt-bowl", "green-salad", "lemon-salmon", ""],
    ];
    return Object.fromEntries(lineup.map((ids, index) => [shiftDate(start, index), Object.fromEntries(slotNames.map((slot, slotIndex) => [slot, ids[slotIndex]]))]));
};
const newId = () => globalThis.crypto?.randomUUID?.() ?? String(Date.now());

const MealPlanner = () => {
    const [selectedDate, setSelectedDate] = useState(() => isoDate(new Date()));
    const [recipes, setRecipes] = useState(() => readStorage(recipesKey, initialRecipes));
    const [plan, setPlan] = useState(() => readStorage(planKey, buildSamplePlan()));
    const [checked, setChecked] = useState(() => readStorage(checkedKey, []));
    const [filter, setFilter] = useState("All recipes");
    const [query, setQuery] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);

    useEffect(() => localStorage.setItem(recipesKey, JSON.stringify(recipes)), [recipes]);
    useEffect(() => localStorage.setItem(planKey, JSON.stringify(plan)), [plan]);
    useEffect(() => localStorage.setItem(checkedKey, JSON.stringify(checked)), [checked]);

    const weekStart = mondayOf(selectedDate);
    const weekDates = Array.from({ length: 7 }, (_, index) => shiftDate(weekStart, index));
    const selectedPlan = plan[selectedDate] ?? {};
    const recipeById = useMemo(() => new Map(recipes.map((recipe) => [recipe.id, recipe])), [recipes]);
    const selectedMeals = slotNames.map((slot) => ({ slot, recipe: recipeById.get(selectedPlan[slot]) })).filter((item) => item.recipe);
    const weekMeals = weekDates.flatMap((date) => slotNames.map((slot) => recipeById.get(plan[date]?.[slot])).filter(Boolean));
    const totalCalories = selectedMeals.reduce((total, item) => total + item.recipe.calories, 0);
    const ingredients = [...new Map(weekMeals.flatMap((recipe) => recipe.ingredients).map((name) => [name.toLocaleLowerCase(), name])).values()].sort((a, b) => a.localeCompare(b));
    const filteredRecipes = recipes.filter((recipe) => (filter === "All recipes" || recipe.type.toLowerCase() === filter.toLowerCase()) && recipe.name.toLowerCase().includes(query.toLowerCase()));
    const dateLabel = `${formatDay(weekDates[0], { month: "short", day: "numeric" })} – ${formatDay(weekDates[6], { month: "short", day: "numeric" })}`;

    const changeMeal = (slot, recipeId) => setPlan((current) => ({ ...current, [selectedDate]: { ...current[selectedDate], [slot]: recipeId } }));
    const addRecipeToPlan = (recipe) => {
        const slot = recipe.type.toLowerCase();
        changeMeal(slot, recipe.id);
        document.getElementById("week-plan")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const createRecipe = (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const recipe = {
            id: newId(), name: String(data.get("name")).trim(), type: String(data.get("type")),
            calories: Math.max(0, Number(data.get("calories"))), minutes: Math.max(1, Number(data.get("minutes"))), color: "peach",
            ingredients: String(data.get("ingredients")).split(",").map((item) => item.trim()).filter(Boolean),
        };
        if (!recipe.name || !recipe.ingredients.length) return;
        setRecipes((current) => [recipe, ...current]);
        setIsAdding(false);
        setFilter("All recipes");
    };
    const deleteRecipe = () => {
        setRecipes((current) => current.filter((recipe) => recipe.id !== pendingDelete.id));
        setPlan((current) => Object.fromEntries(Object.entries(current).map(([date, slots]) => [date, Object.fromEntries(Object.entries(slots).map(([slot, recipeId]) => [slot, recipeId === pendingDelete.id ? "" : recipeId]))])));
        setPendingDelete(null);
    };
    const toggleIngredient = (ingredient) => setChecked((current) => current.includes(ingredient.toLowerCase()) ? current.filter((item) => item !== ingredient.toLowerCase()) : [...current, ingredient.toLowerCase()]);

    return <div className={styles.mealPlanner}>
        <section className={styles.hero}>
            <div><p className={styles.eyebrow}>MAKE SPACE FOR GOOD FOOD</p><h1>Plan a week.<br /><span>Enjoy every bite.</span></h1><p className={styles.heroCopy}>A little prep, plenty of room to make it your own.</p></div>
            <div className={styles.heroNote}><div className={styles.notePlate}><span>✳</span></div><div><span>THIS WEEK'S NOTE</span><strong>Good food, no fuss.</strong><small>Simple ideas for the days ahead.</small></div><FiEdit3 aria-hidden="true" /></div>
        </section>

        <div className={styles.summaryRow} aria-label="This week's plan summary"><article><span className={styles.summaryIcon}><FiCheck aria-hidden="true" /></span><div><strong>{weekMeals.length}</strong><small>meals planned</small></div></article><article><span className={styles.summaryIcon}><FiSun aria-hidden="true" /></span><div><strong>{new Set(weekDates.filter((date) => slotNames.some((slot) => plan[date]?.[slot])).map((date) => date)).size}<small> / 7</small></strong><small>days with a plan</small></div></article><article><span className={styles.summaryIcon}><FiShoppingBag aria-hidden="true" /></span><div><strong>{ingredients.length}</strong><small>shopping list items</small></div></article><span className={styles.localBadge}>SAVED ON THIS DEVICE</span></div>

        <div className={styles.mainGrid}>
            <section className={styles.plannerCard} id="week-plan" aria-labelledby="planner-title">
                <div className={styles.weekHeading}><div><span className={styles.sectionKicker}>YOUR WEEKLY MENU</span><h2 id="planner-title">A plan that feels good</h2></div><div className={styles.weekControls}><button type="button" aria-label="Previous week" onClick={() => setSelectedDate((date) => shiftDate(date, -7))}><FiArrowLeft aria-hidden="true" /></button><button type="button" className={styles.weekLabel} onClick={() => setSelectedDate(isoDate(new Date()))}>{dateLabel}<small>THIS WEEK</small></button><button type="button" aria-label="Next week" onClick={() => setSelectedDate((date) => shiftDate(date, 7))}><FiArrowRight aria-hidden="true" /></button></div></div>
                <div className={styles.dayStrip} aria-label="Choose a day">{weekDates.map((date) => <button key={date} type="button" className={date === selectedDate ? styles.activeDay : ""} aria-pressed={date === selectedDate} onClick={() => setSelectedDate(date)}><span>{formatDay(date, { weekday: "short" })}</span><strong>{formatDay(date, { day: "numeric" })}</strong><i>{slotNames.filter((slot) => plan[date]?.[slot]).length} meals</i></button>)}</div>
                <div className={styles.daySummary}><div><h3>{formatDay(selectedDate, { weekday: "long", month: "long", day: "numeric" })}</h3><p>{selectedMeals.length ? `${selectedMeals.length} meal ideas ready for today` : "Start with one meal you are looking forward to."}</p></div><div className={styles.caloriePill}><strong>{totalCalories.toLocaleString("en-US")}</strong><span>planned kcal</span></div></div>
                <div className={styles.mealSlots}>{slotNames.map((slot) => {
                    const Icon = slotIcons[slot];
                    const selected = recipeById.get(selectedPlan[slot]);
                    const typeRecipes = recipes.filter((recipe) => recipe.type.toLowerCase() === slot);
                    return <article className={styles.mealSlot} key={slot}><div className={styles.slotHeading}><span className={styles.slotIcon}><Icon aria-hidden="true" /></span><div><h4>{slot}</h4><small>{selected ? `${selected.minutes} min · ${selected.calories} kcal` : "Leave it open"}</small></div>{selected && <button className={styles.clearMeal} type="button" aria-label={`Remove ${selected.name} from ${slot}`} onClick={() => setPendingDelete({ id: selected.id, name: selected.name, slot })}><FiTrash2 aria-hidden="true" /></button>}</div>{selected ? <><div className={`${styles.recipeArt} ${styles[selected.color]}`}><span aria-hidden="true">{selected.type === "Breakfast" ? "☼" : selected.type === "Lunch" ? "✿" : selected.type === "Dinner" ? "◒" : "✳"}</span><strong>{selected.name}</strong></div><label className={styles.changeLabel} htmlFor={`meal-${slot}`}>Choose another idea</label><select id={`meal-${slot}`} value={selected.id} onChange={(event) => changeMeal(slot, event.target.value)}><option value="">Leave this meal open</option>{typeRecipes.map((recipe) => <option value={recipe.id} key={recipe.id}>{recipe.name}</option>)}</select></> : <div className={styles.emptySlot}><span>＋</span><strong>A little breathing room</strong><select aria-label={`Choose a ${slot} recipe`} value="" onChange={(event) => changeMeal(slot, event.target.value)}><option value="">Add an idea…</option>{typeRecipes.map((recipe) => <option value={recipe.id} key={recipe.id}>{recipe.name}</option>)}</select></div>}</article>;
                })}</div>
            </section>

            <aside className={styles.shoppingCard} id="shopping" aria-labelledby="shopping-title">
                <div className={styles.shoppingHeading}><span className={styles.shoppingIcon}><FiShoppingBag aria-hidden="true" /></span><div><span className={styles.sectionKicker}>READY WHEN YOU ARE</span><h2 id="shopping-title">Shopping list</h2></div><span className={styles.itemCount}>{ingredients.length}</span></div>
                <p className={styles.shoppingSub}>A simple list from your week’s recipes.</p>
                <div className={styles.listProgress}><span>{checked.filter((item) => ingredients.some((name) => name.toLowerCase() === item)).length} of {ingredients.length} picked up</span><div><i style={{ width: `${ingredients.length ? checked.filter((item) => ingredients.some((name) => name.toLowerCase() === item)).length / ingredients.length * 100 : 0}%` }} /></div></div>
                <ul className={styles.ingredientList}>{ingredients.map((ingredient) => <li key={ingredient}><label className={checked.includes(ingredient.toLowerCase()) ? styles.checkedItem : ""}><input type="checkbox" checked={checked.includes(ingredient.toLowerCase())} onChange={() => toggleIngredient(ingredient)} /><span className={styles.fakeCheck}><FiCheck aria-hidden="true" /></span><span>{ingredient}</span></label></li>)}{ingredients.length === 0 && <li className={styles.listEmpty}>Add meals to see what you need.</li>}</ul>
                <div className={styles.shoppingFooter}><span>INGREDIENTS ACROSS THE WEEK</span><strong>{ingredients.length} items</strong></div>
            </aside>
        </div>

        <section className={styles.recipeSection} id="recipes" aria-labelledby="recipes-title">
            <div className={styles.recipeHeading}><div><span className={styles.sectionKicker}>YOUR LITTLE RECIPE BOX</span><h2 id="recipes-title">Ideas for the table</h2><p>Pick a favorite, or leave a day open for something new.</p></div><button className={styles.addRecipeButton} type="button" onClick={() => setIsAdding(true)}><FiPlus aria-hidden="true" /> Create a recipe</button></div>
            <div className={styles.libraryControls}><div className={styles.filters} aria-label="Filter recipes">{mealTypes.map((type) => <button key={type} type="button" aria-pressed={filter === type} className={filter === type ? styles.activeFilter : ""} onClick={() => setFilter(type)}>{type}</button>)}</div><label className={styles.searchBox}><span>Search recipes</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try a favorite ingredient" /></label></div>
            <div className={styles.recipeGrid}>{filteredRecipes.map((recipe, index) => <article className={styles.recipeCard} key={recipe.id}><div className={`${styles.recipeTile} ${styles[recipe.color]}`}><span>{recipe.type === "Breakfast" ? "☼" : recipe.type === "Lunch" ? "✿" : recipe.type === "Dinner" ? "◒" : "✳"}</span><small>{recipe.type}</small><i>{String(index + 1).padStart(2, "0")}</i></div><div className={styles.recipeInfo}><span className={styles.recipeType}>{recipe.type.toUpperCase()}</span><h3>{recipe.name}</h3><div className={styles.recipeMeta}><span><FiClock aria-hidden="true" /> {recipe.minutes} min</span><span>{recipe.calories} kcal</span></div><div className={styles.recipeActions}><button type="button" onClick={() => addRecipeToPlan(recipe)}><FiPlus aria-hidden="true" /> Add to {formatDay(selectedDate, { weekday: "short" })}</button><button type="button" aria-label={`Delete ${recipe.name}`} onClick={() => setPendingDelete({ id: recipe.id, name: recipe.name, isRecipe: true })}><FiTrash2 aria-hidden="true" /></button></div></div></article>)}</div>
            {filteredRecipes.length === 0 && <p className={styles.noRecipes}>No recipes match that search. Try another word or make a new recipe.</p>}
        </section>

        {isAdding && <div className={styles.modalOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAdding(false); }}><section className={styles.recipeModal} role="dialog" aria-modal="true" aria-labelledby="new-recipe-title"><div className={styles.modalHeading}><div><span className={styles.sectionKicker}>ADD TO YOUR RECIPE BOX</span><h2 id="new-recipe-title">Make a little plan</h2></div><button type="button" aria-label="Close" onClick={() => setIsAdding(false)}><FiX aria-hidden="true" /></button></div><form onSubmit={createRecipe}><label>Recipe name<input name="name" placeholder="e.g. roasted veggie wrap" maxLength="70" required autoFocus /></label><div className={styles.formRow}><label>Meal type<select name="type" defaultValue="Lunch">{["Breakfast", "Lunch", "Dinner", "Snack"].map((type) => <option key={type}>{type}</option>)}</select></label><label>Calories<input name="calories" type="number" min="0" max="4000" defaultValue="450" required /></label><label>Minutes<input name="minutes" type="number" min="1" max="600" defaultValue="20" required /></label></div><label>Ingredients <small>Separate with commas</small><textarea name="ingredients" placeholder="chickpeas, spinach, lemon" maxLength="300" required /></label><div className={styles.modalActions}><button type="button" onClick={() => setIsAdding(false)}>Cancel</button><button type="submit"><FiPlus aria-hidden="true" /> Save recipe</button></div></form></section></div>}
        {pendingDelete && <ConfirmDialog title={pendingDelete.isRecipe ? "Remove this recipe?" : "Clear this meal?"} description={pendingDelete.isRecipe ? `${pendingDelete.name} will be removed from your recipe box and weekly plans.` : `${pendingDelete.name} will be removed from ${pendingDelete.slot}.`} confirmLabel={pendingDelete.isRecipe ? "Remove recipe" : "Clear meal"} onCancel={() => setPendingDelete(null)} onConfirm={pendingDelete.isRecipe ? deleteRecipe : () => { changeMeal(pendingDelete.slot, ""); setPendingDelete(null); }} />}
    </div>;
};

export default MealPlanner;
