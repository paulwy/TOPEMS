use crate::models::*;
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct RsRepository {
    pool: PgPool,
}

impl RsRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // ==================== 项目操作 ====================
    pub async fn create_project(&self, req: CreateProjectRequest) -> Result<Project, sqlx::Error> {
        let now = Utc::now();
        let project = Project {
            id: Uuid::new_v4(),
            name: req.name,
            description: req.description,
            status: "pending".to_string(),
            priority: req.priority,
            start_date: req.start_date,
            end_date: req.end_date,
            created_by: req.created_by,
            created_at: now,
            updated_at: now,
        };

        sqlx::query_as::<_, Project>(
            r#"
            INSERT INTO rs.projects (id, name, description, status, priority, start_date, end_date, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, name, description, status, priority, start_date, end_date, created_by, created_at, updated_at
            "#,
        )
        .bind(project.id)
        .bind(&project.name)
        .bind(&project.description)
        .bind(&project.status)
        .bind(&project.priority)
        .bind(project.start_date)
        .bind(project.end_date)
        .bind(project.created_by)
        .bind(project.created_at)
        .bind(project.updated_at)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_project(&self, id: Uuid) -> Result<Option<Project>, sqlx::Error> {
        sqlx::query_as::<_, Project>(
            r#"
            SELECT id, name, description, status, priority, start_date, end_date, created_by, created_at, updated_at
            FROM rs.projects
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn list_projects(&self, limit: i64, offset: i64) -> Result<Vec<Project>, sqlx::Error> {
        sqlx::query_as::<_, Project>(
            r#"
            SELECT id, name, description, status, priority, start_date, end_date, created_by, created_at, updated_at
            FROM rs.projects
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn update_project(
        &self,
        id: Uuid,
        req: UpdateProjectRequest,
    ) -> Result<Option<Project>, sqlx::Error> {
        let existing = self.get_project(id).await?;
        if existing.is_none() {
            return Ok(None);
        }
        let p = existing.unwrap();

        let new_name = req.name.unwrap_or(p.name);
        let new_description = req.description.or(p.description);
        let new_status = req.status.unwrap_or(p.status);
        let new_priority = req.priority.unwrap_or(p.priority);
        let new_start_date = req.start_date.or(p.start_date);
        let new_end_date = req.end_date.or(p.end_date);

        sqlx::query_as::<_, Project>(
            r#"
            UPDATE rs.projects
            SET name = $1, description = $2, status = $3, priority = $4, start_date = $5, end_date = $6, updated_at = $7
            WHERE id = $8
            RETURNING id, name, description, status, priority, start_date, end_date, created_by, created_at, updated_at
            "#,
        )
        .bind(new_name)
        .bind(new_description)
        .bind(new_status)
        .bind(new_priority)
        .bind(new_start_date)
        .bind(new_end_date)
        .bind(Utc::now())
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn delete_project(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM rs.projects WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    // ==================== 实验操作 ====================
    pub async fn create_experiment(&self, req: CreateExperimentRequest) -> Result<Experiment, sqlx::Error> {
        let now = Utc::now();
        let experiment = Experiment {
            id: Uuid::new_v4(),
            project_id: req.project_id,
            name: req.name,
            description: req.description,
            status: "pending".to_string(),
            experiment_type: req.experiment_type,
            created_by: req.created_by,
            created_at: now,
            started_at: None,
            completed_at: None,
        };

        sqlx::query_as::<_, Experiment>(
            r#"
            INSERT INTO rs.experiments (id, project_id, name, description, status, experiment_type, created_by, created_at, started_at, completed_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, project_id, name, description, status, experiment_type, created_by, created_at, started_at, completed_at
            "#,
        )
        .bind(experiment.id)
        .bind(experiment.project_id)
        .bind(&experiment.name)
        .bind(&experiment.description)
        .bind(&experiment.status)
        .bind(&experiment.experiment_type)
        .bind(experiment.created_by)
        .bind(experiment.created_at)
        .bind(experiment.started_at)
        .bind(experiment.completed_at)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_experiment(&self, id: Uuid) -> Result<Option<Experiment>, sqlx::Error> {
        sqlx::query_as::<_, Experiment>(
            r#"
            SELECT id, project_id, name, description, status, experiment_type, created_by, created_at, started_at, completed_at
            FROM rs.experiments
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn list_experiments(
        &self,
        project_id: Option<Uuid>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Experiment>, sqlx::Error> {
        if let Some(pid) = project_id {
            sqlx::query_as::<_, Experiment>(
                r#"
                SELECT id, project_id, name, description, status, experiment_type, created_by, created_at, started_at, completed_at
                FROM rs.experiments
                WHERE project_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                "#,
            )
            .bind(pid)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
        } else {
            sqlx::query_as::<_, Experiment>(
                r#"
                SELECT id, project_id, name, description, status, experiment_type, created_by, created_at, started_at, completed_at
                FROM rs.experiments
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
                "#,
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
        }
    }

    pub async fn update_experiment(
        &self,
        id: Uuid,
        req: UpdateExperimentRequest,
    ) -> Result<Option<Experiment>, sqlx::Error> {
        let existing = self.get_experiment(id).await?;
        if existing.is_none() {
            return Ok(None);
        }
        let e = existing.unwrap();

        let new_name = req.name.unwrap_or(e.name);
        let new_description = req.description.or(e.description);
        let new_status = req.status.unwrap_or(e.status);
        let new_experiment_type = req.experiment_type.or(e.experiment_type);
        let now = Utc::now();

        let new_started_at = if new_status == "running" && e.started_at.is_none() {
            Some(now)
        } else {
            e.started_at
        };

        let new_completed_at = if (new_status == "completed" || new_status == "failed" || new_status == "cancelled") && e.completed_at.is_none() {
            Some(now)
        } else {
            e.completed_at
        };

        sqlx::query_as::<_, Experiment>(
            r#"
            UPDATE rs.experiments
            SET name = $1, description = $2, status = $3, experiment_type = $4, started_at = $5, completed_at = $6
            WHERE id = $7
            RETURNING id, project_id, name, description, status, experiment_type, created_by, created_at, started_at, completed_at
            "#,
        )
        .bind(new_name)
        .bind(new_description)
        .bind(new_status)
        .bind(new_experiment_type)
        .bind(new_started_at)
        .bind(new_completed_at)
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn delete_experiment(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM rs.experiments WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    // ==================== 配方操作 ====================
    pub async fn create_formula(&self, req: CreateFormulaRequest) -> Result<Formula, sqlx::Error> {
        let mut tx = self.pool.begin().await?;
        let now = Utc::now();
        let formula_id = Uuid::new_v4();

        let formula = sqlx::query_as::<_, FormulaWithoutIngredients>(
            r#"
            INSERT INTO rs.formulas (id, project_id, name, version, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, project_id, name, version, created_by, created_at, updated_at
            "#,
        )
        .bind(formula_id)
        .bind(req.project_id)
        .bind(&req.name)
        .bind(&req.version)
        .bind(req.created_by)
        .bind(now)
        .bind(now)
        .fetch_one(&mut *tx)
        .await?;

        let mut ingredients = Vec::new();
        for ingredient_req in req.ingredients {
            let ingredient = sqlx::query_as::<_, Ingredient>(
                r#"
                INSERT INTO rs.ingredients (id, formula_id, name, quantity, unit, percentage)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, formula_id, name, quantity, unit, percentage
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(formula_id)
            .bind(&ingredient_req.name)
            .bind(ingredient_req.quantity)
            .bind(&ingredient_req.unit)
            .bind(ingredient_req.percentage)
            .fetch_one(&mut *tx)
            .await?;
            ingredients.push(ingredient);
        }

        tx.commit().await?;

        Ok(Formula {
            id: formula.id,
            project_id: formula.project_id,
            name: formula.name,
            version: formula.version,
            created_by: formula.created_by,
            created_at: formula.created_at,
            updated_at: formula.updated_at,
            ingredients,
        })
    }

    pub async fn get_formula(&self, id: Uuid) -> Result<Option<Formula>, sqlx::Error> {
        let formula = sqlx::query_as::<_, FormulaWithoutIngredients>(
            r#"
            SELECT id, project_id, name, version, created_by, created_at, updated_at
            FROM rs.formulas
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        match formula {
            Some(f) => {
                let ingredients = sqlx::query_as::<_, Ingredient>(
                    r#"
                    SELECT id, formula_id, name, quantity, unit, percentage
                    FROM rs.ingredients
                    WHERE formula_id = $1
                    "#,
                )
                .bind(id)
                .fetch_all(&self.pool)
                .await?;

                Ok(Some(Formula {
                    id: f.id,
                    project_id: f.project_id,
                    name: f.name,
                    version: f.version,
                    created_by: f.created_by,
                    created_at: f.created_at,
                    updated_at: f.updated_at,
                    ingredients,
                }))
            }
            None => Ok(None),
        }
    }

    pub async fn list_formulas(
        &self,
        project_id: Option<Uuid>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Formula>, sqlx::Error> {
        let formulas = if let Some(pid) = project_id {
            sqlx::query_as::<_, FormulaWithoutIngredients>(
                r#"
                SELECT id, project_id, name, version, created_by, created_at, updated_at
                FROM rs.formulas
                WHERE project_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                "#,
            )
            .bind(pid)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, FormulaWithoutIngredients>(
                r#"
                SELECT id, project_id, name, version, created_by, created_at, updated_at
                FROM rs.formulas
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
                "#,
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?
        };

        let mut result = Vec::new();
        for f in formulas {
            let ingredients = sqlx::query_as::<_, Ingredient>(
                r#"
                SELECT id, formula_id, name, quantity, unit, percentage
                FROM rs.ingredients
                WHERE formula_id = $1
                "#,
            )
            .bind(f.id)
            .fetch_all(&self.pool)
            .await?;
            result.push(Formula {
                id: f.id,
                project_id: f.project_id,
                name: f.name,
                version: f.version,
                created_by: f.created_by,
                created_at: f.created_at,
                updated_at: f.updated_at,
                ingredients,
            });
        }
        Ok(result)
    }

    pub async fn update_formula(
        &self,
        id: Uuid,
        req: UpdateFormulaRequest,
    ) -> Result<Option<Formula>, sqlx::Error> {
        let mut tx = self.pool.begin().await?;
        let existing = sqlx::query_as::<_, FormulaWithoutIngredients>(
            r#"
            SELECT id, project_id, name, version, created_by, created_at, updated_at
            FROM rs.formulas
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&mut *tx)
        .await?;

        if existing.is_none() {
            tx.commit().await?;
            return Ok(None);
        }
        let f = existing.unwrap();

        let new_name = req.name.unwrap_or(f.name);
        let new_version = req.version.unwrap_or(f.version);

        let updated_formula = sqlx::query_as::<_, FormulaWithoutIngredients>(
            r#"
            UPDATE rs.formulas
            SET name = $1, version = $2, updated_at = $3
            WHERE id = $4
            RETURNING id, project_id, name, version, created_by, created_at, updated_at
            "#,
        )
        .bind(new_name)
        .bind(new_version)
        .bind(Utc::now())
        .bind(id)
        .fetch_one(&mut *tx)
        .await?;

        if let Some(ingredients_req) = req.ingredients {
            sqlx::query("DELETE FROM rs.ingredients WHERE formula_id = $1")
                .bind(id)
                .execute(&mut *tx)
                .await?;
            for ingredient_req in ingredients_req {
                sqlx::query(
                    r#"
                    INSERT INTO rs.ingredients (id, formula_id, name, quantity, unit, percentage)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    "#,
                )
                .bind(Uuid::new_v4())
                .bind(id)
                .bind(&ingredient_req.name)
                .bind(ingredient_req.quantity)
                .bind(&ingredient_req.unit)
                .bind(ingredient_req.percentage)
                .execute(&mut *tx)
                .await?;
            }
        }

        let ingredients = sqlx::query_as::<_, Ingredient>(
            r#"
            SELECT id, formula_id, name, quantity, unit, percentage
            FROM rs.ingredients
            WHERE formula_id = $1
            "#,
        )
        .bind(id)
        .fetch_all(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(Some(Formula {
            id: updated_formula.id,
            project_id: updated_formula.project_id,
            name: updated_formula.name,
            version: updated_formula.version,
            created_by: updated_formula.created_by,
            created_at: updated_formula.created_at,
            updated_at: updated_formula.updated_at,
            ingredients,
        }))
    }

    pub async fn delete_formula(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM rs.formulas WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
